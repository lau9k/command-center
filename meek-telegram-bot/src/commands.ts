import { Bot, Context } from "grammy";
import { getAdminUserIds } from "./config";
import { getStats } from "./stats";
import { log, logError } from "./logger";

function isAdmin(userId: number): boolean {
  return getAdminUserIds().includes(userId);
}

async function fetchMeekPrice(): Promise<{ price: number; change24h: number } | null> {
  const coinId = process.env.COINGECKO_COIN_ID || "meek";
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      log("Price", `CoinGecko API returned ${response.status}`);
      return null;
    }
    const data = await response.json() as Record<string, { usd: number; usd_24h_change: number }>;
    const coinData = data[coinId];
    if (!coinData) return null;
    return {
      price: coinData.usd,
      change24h: coinData.usd_24h_change,
    };
  } catch (error) {
    logError("Price", error);
    return null;
  }
}

export function registerCommands(bot: Bot): void {
  bot.command("pin", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      log("Command", `/pin denied for user ${userId}`);
      return;
    }

    const replyMessage = ctx.message?.reply_to_message;
    if (!replyMessage) {
      await ctx.reply("Reply to a message to pin it.");
      return;
    }

    try {
      await ctx.api.pinChatMessage(ctx.chat!.id, replyMessage.message_id);
      log("Command", `message ${replyMessage.message_id} pinned by ${userId}`);
    } catch (error) {
      log("Command", `failed to pin message: ${error}`);
      await ctx.reply("Failed to pin message. Make sure I have admin privileges.");
    }
  });

  bot.command("stats", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      log("Command", `/stats denied for user ${userId}`);
      return;
    }

    try {
      const chatId = ctx.chat!.id;
      const memberCount = await ctx.api.getChatMemberCount(chatId);
      const { messagesToday, activeUsersToday } = getStats();

      const statsMessage = [
        "MEEK Community Stats:",
        `Members: ${memberCount}`,
        `Messages today: ${messagesToday}`,
        `Active users today: ${activeUsersToday}`,
      ].join("\n");

      await ctx.reply(statsMessage);
      log("Command", `/stats requested by ${userId}`);
    } catch (error) {
      log("Command", `failed to get stats: ${error}`);
      await ctx.reply("Failed to retrieve stats.");
    }
  });

  bot.command("price", async (ctx: Context) => {
    log("Command", `/price requested by ${ctx.from?.id}`);
    const data = await fetchMeekPrice();
    if (!data) {
      await ctx.reply("Unable to fetch $MEEK price right now. Please try again later.");
      return;
    }

    const priceFormatted = data.price < 0.01
      ? `$${data.price.toFixed(8)}`
      : `$${data.price.toFixed(4)}`;
    const changeSign = data.change24h >= 0 ? "+" : "";
    const changeFormatted = `${changeSign}${data.change24h.toFixed(2)}%`;

    const message = [
      `$MEEK Price: ${priceFormatted}`,
      `24h Change: ${changeFormatted}`,
      "",
      "Data from CoinGecko",
    ].join("\n");

    await ctx.reply(message);
  });

  bot.command("website", async (ctx: Context) => {
    log("Command", `/website requested by ${ctx.from?.id}`);
    const url = process.env.MEEK_WEBSITE_URL;
    if (!url) {
      await ctx.reply("Website URL not configured.");
      return;
    }
    await ctx.reply(`Visit the MEEK website: ${url}`);
  });

  bot.command("socials", async (ctx: Context) => {
    log("Command", `/socials requested by ${ctx.from?.id}`);
    const lines: string[] = ["MEEK Socials:"];

    const website = process.env.MEEK_WEBSITE_URL;
    const twitter = process.env.MEEK_TWITTER_URL;
    const telegram = process.env.MEEK_TELEGRAM_URL;

    if (website) lines.push(`Website: ${website}`);
    if (twitter) lines.push(`Twitter/X: ${twitter}`);
    if (telegram) lines.push(`Telegram: ${telegram}`);

    if (lines.length === 1) {
      await ctx.reply("Social links not configured.");
      return;
    }

    await ctx.reply(lines.join("\n"));
  });
}
