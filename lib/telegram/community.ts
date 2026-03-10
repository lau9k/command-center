import "server-only";

export interface TelegramStats {
  memberCount: number;
  title: string | null;
  description: string | null;
  fetchedAt: string;
}

/**
 * Fetches the community member count from the Telegram API
 * using the MEEK community bot token and chat ID.
 */
export async function fetchCommunityMemberCount(): Promise<number> {
  const token = process.env.MEEK_COMMUNITY_BOT_TOKEN;
  const chatId = process.env.MEEK_COMMUNITY_CHAT_ID;

  if (!token || !chatId) {
    return 0;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMemberCount`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId }),
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    );

    const data = await res.json();
    if (data.ok && typeof data.result === "number") {
      return data.result;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Fetches chat info (title, description) from the Telegram Bot API.
 */
export async function fetchChatInfo(): Promise<{
  title: string | null;
  description: string | null;
}> {
  const token = process.env.MEEK_COMMUNITY_BOT_TOKEN;
  const chatId = process.env.MEEK_COMMUNITY_CHAT_ID;

  if (!token || !chatId) {
    return { title: null, description: null };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId }),
        next: { revalidate: 300 },
      }
    );

    const data = await res.json();
    if (data.ok && data.result) {
      return {
        title: data.result.title ?? null,
        description: data.result.description ?? null,
      };
    }
    return { title: null, description: null };
  } catch {
    return { title: null, description: null };
  }
}

/**
 * Fetches combined Telegram stats: member count + chat info.
 * Returns null if env vars are missing or both API calls fail.
 */
export async function fetchTelegramStats(): Promise<TelegramStats | null> {
  const token = process.env.MEEK_COMMUNITY_BOT_TOKEN;
  const chatId = process.env.MEEK_COMMUNITY_CHAT_ID;

  if (!token || !chatId) {
    return null;
  }

  const [memberCount, chatInfo] = await Promise.all([
    fetchCommunityMemberCount(),
    fetchChatInfo(),
  ]);

  if (memberCount === 0 && !chatInfo.title) {
    return null;
  }

  return {
    memberCount,
    title: chatInfo.title,
    description: chatInfo.description,
    fetchedAt: new Date().toISOString(),
  };
}
