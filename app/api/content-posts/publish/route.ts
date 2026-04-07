import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { schedulePost, updatePost } from "@/lib/lateso-client";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

const publishSchema = z.object({
  id: z.string().uuid(),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch the content post
  const { data: post, error: fetchError } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (fetchError || !post) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Content post not found" },
      { status: 404 }
    );
  }

  const contentPost = post as ContentPost;

  if (contentPost.status === "published") {
    return NextResponse.json(
      { error: "Content post is already published" },
      { status: 400 }
    );
  }

  const text = contentPost.body ?? contentPost.title ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "Content post has no text content" },
      { status: 400 }
    );
  }

  const platform =
    contentPost.platform ?? contentPost.platforms?.[0] ?? "twitter";
  const scheduledFor =
    parsed.data.scheduledFor ?? contentPost.scheduled_for ?? undefined;

  // If the post already has a late_post_id, update it; otherwise create new
  let latePostId: string;

  if (contentPost.late_post_id) {
    const updated = await updatePost(contentPost.late_post_id, {
      text,
      platform,
      scheduledFor,
    });
    latePostId = updated.id;
  } else {
    const created = await schedulePost({
      text,
      platform,
      scheduledFor,
      mediaUrls: contentPost.media_urls ?? undefined,
    });
    latePostId = created.id;
  }

  // Determine new status
  const newStatus: ContentPostStatus = scheduledFor ? "scheduled" : "published";
  const updateFields: Record<string, unknown> = {
    late_post_id: latePostId,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (scheduledFor) {
    updateFields.scheduled_for = scheduledFor;
  }
  if (newStatus === "published") {
    updateFields.published_at = new Date().toISOString();
  }

  const { data: updatedPost, error: updateError } = await supabase
    .from("content_posts")
    .update(updateFields)
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updatedPost });
}));
