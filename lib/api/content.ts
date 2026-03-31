import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ContentPost } from "@/lib/types/database";

// ── Select clauses ───────────────────────────────────────

const POST_WITH_PROJECT =
  "*, projects:project_id(id, name, color)" as const;

// ── Read ─────────────────────────────────────────────────

export async function getPostById(id: string): Promise<ContentPost | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("content_posts")
    .select(POST_WITH_PROJECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as ContentPost;
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
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as ContentPost[];
}

// ── Write ────────────────────────────────────────────────

export async function createPost(
  input: Partial<ContentPost>
): Promise<ContentPost> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("content_posts")
    .insert(input)
    .select(POST_WITH_PROJECT)
    .single();

  if (error) throw error;

  return data as ContentPost;
}

export async function updatePost(
  id: string,
  updates: Partial<ContentPost>
): Promise<ContentPost> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("content_posts")
    .update(updates)
    .eq("id", id)
    .select(POST_WITH_PROJECT)
    .single();

  if (error) throw error;

  return data as ContentPost;
}

export async function schedulePost(
  id: string,
  scheduled_at: string
): Promise<ContentPost> {
  return updatePost(id, { scheduled_at, status: "scheduled" });
}

export async function deletePost(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
