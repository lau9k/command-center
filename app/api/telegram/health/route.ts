import { NextResponse } from "next/server";
import { fetchCommunityMemberCount } from "@/lib/telegram/community";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      status: "offline",
      reason: "TELEGRAM_BOT_TOKEN not configured",
      memberCount: 0,
      webhookUrl: null,
      lastErrorDate: null,
      lastErrorMessage: null,
      pendingUpdateCount: 0,
      checkedAt: new Date().toISOString(),
    });
  }

  try {
    const [webhookRes, memberCount] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        method: "GET",
        next: { revalidate: 60 },
      }),
      fetchCommunityMemberCount(),
    ]);

    const webhookData = await webhookRes.json();

    if (!webhookData.ok) {
      return NextResponse.json({
        status: "offline",
        reason: "Failed to fetch webhook info",
        memberCount,
        webhookUrl: null,
        lastErrorDate: null,
        lastErrorMessage: null,
        pendingUpdateCount: 0,
        checkedAt: new Date().toISOString(),
      });
    }

    const info = webhookData.result;
    const hasWebhook = !!info.url;
    const hasRecentError = !!info.last_error_date;

    return NextResponse.json({
      status: hasWebhook && !hasRecentError ? "online" : hasWebhook ? "degraded" : "offline",
      memberCount,
      webhookUrl: info.url || null,
      lastErrorDate: info.last_error_date
        ? new Date(info.last_error_date * 1000).toISOString()
        : null,
      lastErrorMessage: info.last_error_message || null,
      pendingUpdateCount: info.pending_update_count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[TG Health] Error checking bot health:", err);
    return NextResponse.json({
      status: "offline",
      reason: "Health check failed",
      memberCount: 0,
      webhookUrl: null,
      lastErrorDate: null,
      lastErrorMessage: null,
      pendingUpdateCount: 0,
      checkedAt: new Date().toISOString(),
    });
  }
}
