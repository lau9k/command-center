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
