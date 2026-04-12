import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logSync } from "@/lib/plaid-sync";
import { schedulePost, getPostStatus } from "@/lib/lateso-client";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

interface LatesoSyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  skipped: number;
  errors: number;
  orphansRequeued: number;
  orphansFailed: number;
}

/**
 * Get the last successful Late.so sync date from sync_log.
 */
async function getLastSyncDate(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "lateso")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  return data?.completed_at ?? null;
}

/**
 * Push: send new/updated content_posts to Late.so for scheduling.
 * Posts with status "ready" and a scheduled_for date get pushed.
 */
async function pushNewPosts(
  since: string | null
): Promise<{ pushed: number; skipped: number; errors: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from("content_posts")
    .select("*")
    .eq("status", "ready")
    .is("late_post_id", null)
    .not("scheduled_for", "is", null);

  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch content posts: ${error.message}`);
  }

  let pushed = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of (posts ?? []) as ContentPost[]) {
    try {
      const text = post.body ?? post.title ?? "";
      if (!text) {
        skipped++;
        continue;
      }

      const platform = post.platform ?? post.platforms?.[0] ?? "twitter";

      const latesoPost = await schedulePost({
        text,
        platform,
        scheduledFor: post.scheduled_for ?? undefined,
        mediaUrls: post.media_urls ?? undefined,
      });

      const { error: updateError } = await supabase
        .from("content_posts")
        .update({
          late_post_id: latesoPost.id,
          status: "scheduled" as ContentPostStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) {
        errors++;
        continue;
      }

      pushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logSync("lateso", "error", 0, `[pushNewPosts] ${msg}`);
      console.error("[lateso-sync] pushNewPosts:", err);
      errors++;
    }
  }

  return { pushed, skipped, errors };
}

/**
 * Pull: fetch status updates from Late.so for posts we've already pushed.
 */
async function pullStatusUpdates(): Promise<{
  pulled: number;
  errors: number;
}> {
  const supabase = createServiceClient();

  // Get all posts that have a late_post_id and are not yet in a terminal state
  const { data: posts, error } = await supabase
    .from("content_posts")
    .select("*")
    .not("late_post_id", "is", null)
    .in("status", ["scheduled"]);

  if (error) {
    throw new Error(
      `Failed to fetch tracked content posts: ${error.message}`
    );
  }

  let pulled = 0;
  let errors = 0;

  for (const post of (posts ?? []) as ContentPost[]) {
    try {
      if (!post.late_post_id) continue;

      const latesoPost = await getPostStatus(post.late_post_id);

      // Map Late.so status to our ContentPostStatus
      let newStatus: ContentPostStatus | null = null;
      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (latesoPost.status === "published" && post.status !== "published") {
        newStatus = "published";
        updateFields.published_at =
          latesoPost.publishedAt ?? new Date().toISOString();
      } else if (latesoPost.status === "failed" && post.status !== "failed") {
        newStatus = "failed";
      }

      if (!newStatus) continue;

      updateFields.status = newStatus;

      const { error: updateError } = await supabase
        .from("content_posts")
        .update(updateFields)
        .eq("id", post.id);

      if (updateError) {
        errors++;
        continue;
      }

      pulled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logSync("lateso", "error", 0, `[pullStatusUpdates] ${msg}`);
      console.error("[lateso-sync] pullStatusUpdates:", err);
      errors++;
    }
  }

  return { pulled, errors };
}

// ---------------------------------------------------------------------------
// Reconcile orphan posts
// ---------------------------------------------------------------------------

export interface OrphanReconcileResult {
  requeued: number;
  failed: number;
  errors: number;
}

/**
 * Find content_posts stuck as "scheduled" with no late_post_id (orphans).
 * For each orphan older than 1 hour:
 *   - Try to re-submit to Late.so
 *   - If that fails, mark the post as "failed" with error_message
 */
export async function reconcileOrphanPosts(): Promise<OrphanReconcileResult> {
  const supabase = createServiceClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: orphans, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("status", "scheduled")
    .is("late_post_id", null)
    .lt("updated_at", oneHourAgo);

  if (error) {
    throw new Error(`Failed to fetch orphan posts: ${error.message}`);
  }

  let requeued = 0;
  let failed = 0;
  let errors = 0;

  for (const post of (orphans ?? []) as ContentPost[]) {
    const text = post.body ?? post.title ?? "";
    if (!text) {
      // No content to submit — mark failed
      await supabase
        .from("content_posts")
        .update({
          status: "failed" as ContentPostStatus,
          error_message: "orphan_no_late_post_id",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      failed++;
      continue;
    }

    const platform = post.platform ?? post.platforms?.[0] ?? "twitter";

    try {
      const latesoPost = await schedulePost({
        text,
        platform,
        scheduledFor: post.scheduled_for ?? undefined,
        mediaUrls: post.media_urls ?? undefined,
      });

      const { error: updateError } = await supabase
        .from("content_posts")
        .update({
          late_post_id: latesoPost.id,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) {
        errors++;
        continue;
      }

      requeued++;
    } catch {
      // Re-submission failed — mark the post as failed
      await supabase
        .from("content_posts")
        .update({
          status: "failed" as ContentPostStatus,
          error_message: "orphan_no_late_post_id",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      failed++;
    }
  }

  return { requeued, failed, errors };
}

/**
 * Orchestrate bidirectional sync: push new posts, then pull status updates.
 */
export async function syncLateso(): Promise<LatesoSyncResult> {
  const supabase = createServiceClient();
  const logId = await logSync("lateso", "running", 0);

  try {
    const lastSync = await getLastSyncDate();

    const pushResult = await pushNewPosts(lastSync);
    const pullResult = await pullStatusUpdates();
    const orphanResult = await reconcileOrphanPosts();

    const totalErrors =
      pushResult.errors + pullResult.errors + orphanResult.errors;
    const totalSynced =
      pushResult.pushed + pullResult.pulled + orphanResult.requeued;
    const status =
      totalErrors > 0 ? (totalSynced > 0 ? "partial" : "error") : "success";

    const errorMsg =
      totalErrors > 0 ? `${totalErrors} operation(s) failed` : undefined;

    if (logId) {
      const totalFound = totalSynced + pushResult.skipped;
      await supabase
        .from("sync_log")
        .update({
          status,
          record_count: totalSynced,
          records_synced: totalSynced,
          records_found: totalFound,
          records_skipped: pushResult.skipped,
          completed_at: new Date().toISOString(),
          ...(errorMsg
            ? { error_message: errorMsg, message: errorMsg }
            : {}),
        })
        .eq("id", logId);
    }

    return {
      success: totalErrors === 0,
      pushed: pushResult.pushed,
      pulled: pullResult.pulled,
      skipped: pushResult.skipped,
      errors: totalErrors,
      orphansRequeued: orphanResult.requeued,
      orphansFailed: orphanResult.failed,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          record_count: 0,
          records_synced: 0,
          records_found: 0,
          records_skipped: 0,
          completed_at: new Date().toISOString(),
          error_message: message,
          message,
        })
        .eq("id", logId);
    }
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      skipped: 0,
      errors: 1,
      orphansRequeued: 0,
      orphansFailed: 0,
    };
  }
}
