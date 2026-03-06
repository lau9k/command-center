import { Bot } from "grammy";
import { Schedule, Templates } from "./config";
import { log, logError } from "./logger";

const timers: NodeJS.Timeout[] = [];

function scheduleInterval(callback: () => void, intervalMs: number): void {
  timers.push(setInterval(callback, intervalMs));
}

export function startScheduler(bot: Bot, chatId: string, schedule: Schedule, templates: Templates): void {
  // Check engagement messages every minute
  scheduleInterval(() => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay();

    for (const entry of schedule.engagementMessages) {
      if (!entry.enabled) continue;
      if (entry.cronHour !== currentHour || entry.cronMinute !== currentMinute) continue;
      if (entry.cronDayOfWeek !== undefined && entry.cronDayOfWeek !== currentDay) continue;

      const template = templates.engagement[entry.template];
      if (!template) {
        logError("Scheduler", new Error(`template not found: ${entry.template}`));
        continue;
      }

      log("Scheduler", `sending engagement message: ${entry.id}`);
      bot.api.sendMessage(chatId, template).catch((err) => {
        logError("Scheduler", err);
      });
    }
  }, 60_000);

  log("Scheduler", `started with ${schedule.engagementMessages.length} scheduled messages`);
}

export function stopScheduler(): void {
  for (const timer of timers) {
    clearInterval(timer);
  }
  timers.length = 0;
  log("Scheduler", "stopped");
}
