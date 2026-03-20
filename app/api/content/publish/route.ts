import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { zernioPublishSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { ContentPost } from "@/lib/types/database";

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

interface ZernioPostResponse {
  id: string;
  status: string;
  platforms: string[];
  createdAt: string;
}

function getZernioApiKey(): string {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) {
    throw new Error("ZERNIO_API_KEY is not configured");
  }
  return key;
}

async function createZernioPost(payload: {
  text: string;
  platforms: string[];
  mediaUrls?: string[];
}): Promise<ZernioPostResponse> {
  const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getZernioApiKey()}`,
    },
    body: JSON.stringify({
      text: payload.text,
      platforms: payload.platforms,
      mediaUrls: payload.mediaUrls,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zernio API error (${res.status}): ${body}`);
  }

  return res.json() as Promise<ZernioPostResponse>;
}

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = zernioPublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { content_post_id, platforms } = parsed.data;

  // Fetch the content post
  const { data: post, error: fetchError } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", content_post_id)
    .single();

  if (fetchError || !post) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Content post not found" },
      { status: 404 }
    );
  }

  const contentPost = post as ContentPost;
  const text = contentPost.body ?? contentPost.caption ?? contentPost.title ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "Content post has no text content" },
      { status: 400 }
    );
  }

  // Call Zernio API for multi-platform distribution
  const zernioPost = await createZernioPost({
    text,
    platforms,
    mediaUrls: contentPost.media_urls ?? undefined,
  });

  // Update the content post with published status and Zernio metadata
  const existingMetrics = (contentPost.metrics ?? {}) as Record<string, unknown>;
  const { data: updatedPost, error: updateError } = await supabase
    .from("content_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      late_post_id: zernioPost.id,
      platforms,
      metrics: {
        ...existingMetrics,
        zernio_post_id: zernioPost.id,
        zernio_platforms: zernioPost.platforms,
        published_via: "zernio",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", content_post_id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: updatedPost,
    zernio_post_id: zernioPost.id,
    platforms_published: platforms,
  });
});
