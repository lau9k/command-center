import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MEEK_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  entities?: { type: string; offset: number; length: number }[];
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[TG] TELEGRAM_BOT_TOKEN is not set");
    throw new Error("TELEGRAM_BOT_TOKEN not configured");
  }

  console.log(`[TG] sendMessage -> chat_id=${chatId}, text_length=${text.length}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  const resBody = await res.json();
  if (!resBody.ok) {
    console.error("[TG] sendMessage failed:", JSON.stringify(resBody));
  } else {
    console.log("[TG] sendMessage succeeded, message_id:", resBody.result?.message_id);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

async function handleContent(chatId: number) {
  const supabase = createServiceClient();

  const { data: posts, error } = await supabase
    .from("content_posts")
    .select("title, caption, platform, status, scheduled_at, scheduled_for, platforms")
    .eq("project_id", MEEK_PROJECT_ID)
    .in("status", ["scheduled", "ready", "draft"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(10);

  if (error) {
    await sendMessage(chatId, "❗ Error fetching content: " + error.message);
    return;
  }

  if (!posts || posts.length === 0) {
    await sendMessage(chatId, "📭 No upcoming content posts found for MEEK.");
    return;
  }

  let msg = "📋 *Upcoming MEEK Content*\n\n";

  for (const post of posts) {
    const title = post.title || post.caption?.slice(0, 50) || "Untitled";
    const scheduleDate = post.scheduled_at || post.scheduled_for;
    const dateStr = scheduleDate ? formatDate(scheduleDate) : "Not scheduled";
    const platformList =
      Array.isArray(post.platforms) && post.platforms.length > 0
        ? post.platforms.join(", ")
        : post.platform || "—";
    const statusIcon =
      post.status === "scheduled"
        ? "🟢"
        : post.status === "ready"
          ? "🟡"
          : "⚪";

    msg += `${statusIcon} *${title}*\n`;
    msg += `   📅 ${dateStr}\n`;
    msg += `   📱 ${platformList}\n\n`;
  }

  await sendMessage(chatId, msg);
}

async function handleNext(chatId: number) {
  const supabase = createServiceClient();

  const { data: post, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("project_id", MEEK_PROJECT_ID)
    .in("status", ["scheduled", "ready"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await sendMessage(chatId, "❗ Error fetching next post: " + error.message);
    return;
  }

  if (!post) {
    await sendMessage(chatId, "📭 No upcoming posts scheduled for MEEK.");
    return;
  }

  const title = post.title || "Untitled";
  const scheduleDate = post.scheduled_at || post.scheduled_for;
  const dateStr = scheduleDate ? formatDate(scheduleDate) : "Not scheduled";
  const platformList =
    Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms.join(", ")
      : post.platform || "—";
  const caption = post.caption || post.body || "No caption set";

  let msg = "📌 *Next Scheduled Post*\n\n";
  msg += `*${title}*\n`;
  msg += `📅 ${dateStr}\n`;
  msg += `📱 ${platformList}\n`;
  msg += `Status: ${post.status}\n\n`;
  msg += `*Caption Preview:*\n${caption}`;

  if (post.image_url) {
    msg += `\n\n🖼 [View Image](${post.image_url})`;
  }

  await sendMessage(chatId, msg);
}

async function handleStats(chatId: number) {
  const supabase = createServiceClient();

  const { count: postCount } = await supabase
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .eq("project_id", MEEK_PROJECT_ID);

  const { count: publishedCount } = await supabase
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .eq("project_id", MEEK_PROJECT_ID)
    .eq("status", "published");

  const { count: scheduledCount } = await supabase
    .from("content_posts")
    .select("*", { count: "exact", head: true })
    .eq("project_id", MEEK_PROJECT_ID)
    .in("status", ["scheduled", "ready"]);

  // Fetch community member count from the community bot
  let communityMemberCount: number | null = null;
  try {
    const communityToken = process.env.MEEK_COMMUNITY_BOT_TOKEN;
    const communityChatId = process.env.MEEK_COMMUNITY_CHAT_ID || "-1003661922248";
    if (communityToken) {
      const res = await fetch(
        `https://api.telegram.org/bot${communityToken}/getChatMemberCount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: communityChatId }),
        }
      );
      const data = await res.json();
      if (data.ok) communityMemberCount = data.result;
    }
  } catch (err) {
    console.error("[TG] Failed to fetch community member count:", err);
  }

  let msg = "📊 *MEEK Community Stats*\n\n";
  msg += `*Content Pipeline*\n`;
  msg += `   Total Posts: ${postCount ?? 0}\n`;
  msg += `   Published: ${publishedCount ?? 0}\n`;
  msg += `   Upcoming: ${scheduledCount ?? 0}\n\n`;
  msg += `*Community*\n`;
  msg += `   👥 Members: ${communityMemberCount !== null ? communityMemberCount.toLocaleString() : "_unavailable_"}\n\n`;
  msg += `*Market Metrics*\n`;
  msg += `   💰 Wallet Count: _coming soon_\n`;
  msg += `   📈 Market Cap: _coming soon_\n`;

  await sendMessage(chatId, msg);
}

function extractCommand(message: TelegramMessage): string | null {
  if (!message.text || !message.entities) return null;

  for (const entity of message.entities) {
    if (entity.type === "bot_command" && entity.offset === 0) {
      const cmd = message.text.slice(entity.offset, entity.offset + entity.length);
      // Strip @botname suffix if present
      return cmd.split("@")[0].toLowerCase();
    }
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    handler: "telegram-webhook",
    message: "Telegram Bot webhook is active. Send POST requests from Telegram.",
  });
}

export async function POST(request: NextRequest) {
  const tokenPresent = !!process.env.TELEGRAM_BOT_TOKEN;
  console.log(`[TG] POST /api/telegram/webhook hit — token_present=${tokenPresent}`);

  try {
    const update: TelegramUpdate = await request.json();
    console.log("[TG] Incoming update:", JSON.stringify(update));

    if (!update.message?.text) {
      console.log("[TG] No message text, skipping");
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const command = extractCommand(update.message);
    console.log(`[TG] chat_id=${chatId}, command=${command}, text="${update.message.text}"`);

    switch (command) {
      case "/content":
        await handleContent(chatId);
        break;
      case "/stats":
        await handleStats(chatId);
        break;
      case "/next":
        await handleNext(chatId);
        break;
      case "/start":
        await sendMessage(
          chatId,
          "👋 *Welcome to MEEK Bot!*\n\n" +
            "Available commands:\n" +
            "/content — View upcoming scheduled posts\n" +
            "/next — Preview the next scheduled post\n" +
            "/stats — Community & content stats"
        );
        break;
      default:
        console.log("[TG] Unknown command or plain message, ignoring");
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TG] Webhook error:", err);
    // Always return 200 so Telegram doesn't stop sending updates
    return NextResponse.json({ ok: true });
  }
}
