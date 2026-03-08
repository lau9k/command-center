import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COMMUNITY_CHAT_ID = process.env.MEEK_COMMUNITY_CHAT_ID || "-1003661922248";

async function telegramApi(method: string) {
  const token = process.env.MEEK_COMMUNITY_BOT_TOKEN;
  if (!token) {
    throw new Error("MEEK_COMMUNITY_BOT_TOKEN not configured");
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: COMMUNITY_CHAT_ID }),
      next: { revalidate: 300 }, // cache for 5 minutes
    }
  );

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API ${method} failed: ${data.description}`);
  }

  return data.result;
}

export async function GET() {
  try {
    const [memberCount, chatInfo, admins] = await Promise.all([
      telegramApi("getChatMemberCount"),
      telegramApi("getChat"),
      telegramApi("getChatAdministrators"),
    ]);

    return NextResponse.json({
      memberCount,
      chat: {
        title: chatInfo.title,
        description: chatInfo.description ?? null,
        photo: chatInfo.photo ?? null,
      },
      adminCount: admins.length,
      admins: admins.map(
        (a: { user: { id: number; first_name: string; username?: string }; status: string }) => ({
          id: a.user.id,
          name: a.user.first_name,
          username: a.user.username ?? null,
          status: a.status,
        })
      ),
    });
  } catch (err) {
    console.error("[Community API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
