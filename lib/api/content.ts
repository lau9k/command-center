import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ContentPost } from "@/lib/types/database";

// ── Select clauses ───────────────────────────────────────

const POST_WITH_PROJECT =
  "*, projects:project_id(id, name, color)" as const;
const POST_WITHOUT_PROJECT = "*" as const;

// ── Read ─────────────────────────────────────────────────

export async function getPostById(id: string): Promise<ContentPost | null> {
  const supabase = createServiceClient();

  let result = await supabase
    .from("content_posts")
    .select(POST_WITH_PROJECT)
    .eq("id", id)
    .single();

  // Fall back if FK relationship not found
  if (result.error?.message?.includes("relationship")) {
    result = await supabase
      .from("content_posts")
      .select(POST_WITHOUT_PROJECT)
      .eq("id", id)
      .single();
  }

  if (result.error) {
    if (result.error.code === "PGRST116") return null;
    throw result.error;
  }

  return result.data as ContentPost;
}

export interface GetPostsFilters {
  status?: string;
}

export async function getPosts(
  filters?: GetPostsFilters
): Promise<ContentPost[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("content_posts")
    .select(POST_WITH_PROJECT)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  let result = await query;

  // Fall back if FK relationship not found
  if (result.error?.message?.includes("relationship")) {
    let fallback = supabase
      .from("content_posts")
      .select(POST_WITHOUT_PROJECT)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filters?.status) {
      fallback = fallback.eq("status", filters.status);
    }

    result = await fallback;
  }

  if (result.error) throw result.error;

  return (result.data ?? []) as ContentPost[];
}

// ── Write ────────────────────────────────────────────────

export async function createPost(
  input: Partial<ContentPost>
): Promise<ContentPost> {
  const supabase = createServiceClient();

  let result = await supabase
    .from("content_posts")
    .insert(input)
    .select(POST_WITH_PROJECT)
    .single();

  if (result.error?.message?.includes("relationship")) {
    result = await supabase
      .from("content_posts")
      .insert(input)
      .select(POST_WITHOUT_PROJECT)
      .single();
  }

  if (result.error) throw result.error;

  return result.data as ContentPost;
}

export async function updatePost(
  id: string,
  updates: Partial<ContentPost>
): Promise<ContentPost> {
  const supabase = createServiceClient();

  let result = await supabase
    .from("content_posts")
    .update(updates)
    .eq("id", id)
    .select(POST_WITH_PROJECT)
    .single();

  if (result.error?.message?.includes("relationship")) {
    result = await supabase
      .from("content_posts")
      .update(updates)
      .eq("id", id)
      .select(POST_WITHOUT_PROJECT)
      .single();
  }

  if (result.error) throw result.error;

  return result.data as ContentPost;
}

export async function schedulePost(
  id: string,
  scheduled_for: string
): Promise<ContentPost> {
  return updatePost(id, { scheduled_for, status: "scheduled" });
}

export async function deletePost(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
