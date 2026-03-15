import "server-only";

const LATE_SO_API_URL = "https://api.late.so";

// ---------- Types ----------

interface SchedulePostPayload {
  text: string;
  platform: string;
  scheduledFor?: string;
  mediaUrls?: string[];
}

interface UpdatePostPayload {
  text?: string;
  platform?: string;
  scheduledFor?: string;
  mediaUrls?: string[];
}

export interface LatesoPost {
  id: string;
  status: "scheduled" | "published" | "failed" | "draft";
  text: string;
  platform: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LatesoListResponse {
  posts: LatesoPost[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- Helpers ----------

function getApiKey(): string {
  const key = process.env.LATE_SO_API_KEY;
  if (!key) {
    throw new Error("LATE_SO_API_KEY is not configured");
  }
  return key;
}

async function latesoFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${LATE_SO_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Late.so API error (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---------- Public API ----------

/**
 * Schedule a new post on Late.so.
 */
export async function schedulePost(
  payload: SchedulePostPayload
): Promise<LatesoPost> {
  return latesoFetch<LatesoPost>("/posts", {
    method: "POST",
    body: JSON.stringify({
      text: payload.text,
      platform: payload.platform,
      scheduledFor: payload.scheduledFor,
      mediaUrls: payload.mediaUrls,
    }),
  });
}

/**
 * Update an existing post on Late.so (e.g. reschedule or edit text).
 */
export async function updatePost(
  latePostId: string,
  payload: UpdatePostPayload
): Promise<LatesoPost> {
  return latesoFetch<LatesoPost>(`/posts/${latePostId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Get the current status of a post on Late.so.
 */
export async function getPostStatus(latePostId: string): Promise<LatesoPost> {
  return latesoFetch<LatesoPost>(`/posts/${latePostId}`, {
    method: "GET",
  });
}

/**
 * List scheduled posts from Late.so with pagination.
 */
export async function listScheduled(
  page = 1,
  pageSize = 50
): Promise<LatesoListResponse> {
  return latesoFetch<LatesoListResponse>(
    `/posts?status=scheduled&page=${page}&pageSize=${pageSize}`,
    { method: "GET" }
  );
}

/**
 * Delete a post from Late.so.
 */
export async function deletePost(latePostId: string): Promise<void> {
  await latesoFetch<unknown>(`/posts/${latePostId}`, {
    method: "DELETE",
  });
}
