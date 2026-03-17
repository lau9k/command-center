import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ContentPostStatus } from "@/lib/types/database";

/**
 * Verify the webhook signature from Late.so.
 */
function verifyWebhookSignature(request: NextRequest): boolean {
  const secret = process.env.LATE_SO_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = request.headers.get("x-lateso-signature");
  return signature === secret;
}

interface LatesoWebhookPayload {
  event: "post.published" | "post.failed" | "post.scheduled" | "post.updated";
  postId: string;
  status: string;
  publishedAt?: string;
  failureReason?: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  if (!verifyWebhookSignature(request)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createServiceClient();

  let payload: LatesoWebhookPayload;
  try {
    payload = (await request.json()) as LatesoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Log the webhook event
  await supabase.from("webhook_events").insert({
    source: "lateso",
    event_type: payload.event,
    payload: payload as unknown as Record<string, unknown>,
    status_code: 200,
    processed: false,
  });

  // Find the content post by late_post_id
  const { data: post, error: fetchError } = await supabase
    .from("content_posts")
    .select("id, status")
    .eq("late_post_id", payload.postId)
    .single();

  if (fetchError || !post) {
    // Return 200 to prevent retries — post may have been deleted
    return NextResponse.json({ received: true, matched: false });
  }

  // Map webhook event to status update
  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  let newStatus: ContentPostStatus | null = null;

  switch (payload.event) {
    case "post.published":
      newStatus = "published";
      updateFields.published_at =
        payload.publishedAt ?? new Date().toISOString();
      break;
    case "post.failed":
      newStatus = "failed";
      break;
    case "post.scheduled":
      newStatus = "scheduled";
      break;
    case "post.updated":
      // No status change — just log the event
      break;
  }

  if (newStatus) {
    updateFields.status = newStatus;

    const { error: updateError } = await supabase
      .from("content_posts")
      .update(updateFields)
      .eq("id", post.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }
  }

  // Mark the webhook event as processed
  await supabase
    .from("webhook_events")
    .update({ processed: true })
    .eq("source", "lateso")
    .eq("event_type", payload.event)
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({ received: true, matched: true });
}
