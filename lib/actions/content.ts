"use server";

import { updatePost } from "@/lib/api/content";
import type { ContentPost } from "@/lib/types/database";

export async function publishPost(id: string): Promise<ContentPost> {
  return updatePost(id, {
    status: "published",
    published_at: new Date().toISOString(),
  });
}

export async function schedulePost(
  id: string,
  scheduled_for: string
): Promise<ContentPost> {
  return updatePost(id, { scheduled_for, status: "scheduled" });
}

export async function updatePostStatus(
  id: string,
  status: string
): Promise<ContentPost> {
  return updatePost(id, { status: status as ContentPost["status"] });
}
