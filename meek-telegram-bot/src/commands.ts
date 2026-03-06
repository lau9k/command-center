import { Bot, Context } from "grammy";
import { getAdminUserIds } from "./config";
import { getStats } from "./stats";
import { log } from "./logger";

function isAdmin(userId: number): boolean {
  return getAdminUserIds().includes(userId);
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
}
