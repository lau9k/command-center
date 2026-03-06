import { Bot } from "grammy";
import { getEnvOrThrow, loadSpamPatterns, loadSchedule, loadTemplates } from "./config";
import { registerCommands } from "./commands";
import { startHealthServer, stopHealthServer } from "./health";
import { log, logError } from "./logger";
import { startScheduler, stopScheduler } from "./scheduler";
import { checkSpam } from "./spam-filter";
import { trackMessage } from "./stats";
import { handleNewMember } from "./welcome";

async function main(): Promise<void> {
  log("Bot", "starting up...");

  const token = getEnvOrThrow("TELEGRAM_BOT_TOKEN");
  const chatId = getEnvOrThrow("TELEGRAM_CHAT_ID");

  const templates = loadTemplates();
  const spamPatterns = loadSpamPatterns();
  const schedule = loadSchedule();

  log("Config", "loaded templates, spam patterns, and schedule");

  const bot = new Bot(token);

  // Welcome new members
  bot.on("message:new_chat_members", async (ctx) => {
    await handleNewMember(ctx, templates);
  });

  // Spam filter runs on every text message
  bot.on("message:text", async (ctx, next) => {
    const isSpam = await checkSpam(ctx, spamPatterns);
    if (!isSpam) {
      trackMessage(ctx.from?.id);
      await next();
    }
  });

  // Also filter captions on media messages
  bot.on("message:caption", async (ctx, next) => {
    const isSpam = await checkSpam(ctx, spamPatterns);
    if (!isSpam) {
      trackMessage(ctx.from?.id);
      await next();
    }
  });

  // Register commands
  registerCommands(bot);

  // Error handler
  bot.catch((err) => {
    logError("Bot", err.error);
  });

  // Start health server
  const healthServer = startHealthServer(3001);

  // Start scheduler
  startScheduler(bot, chatId, schedule, templates);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log("Bot", `received ${signal}, shutting down gracefully...`);
    stopScheduler();
    bot.stop();
    await stopHealthServer();
    log("Bot", "shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Start the bot
  log("Bot", "connecting to Telegram...");
  await bot.start({
    onStart: () => {
      log("Bot", "connected and running!");
    },
  });
}

main().catch((err) => {
  logError("Fatal", err);
  process.exit(1);
});
