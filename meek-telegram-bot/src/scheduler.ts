import { Bot } from "grammy";
import * as cron from "node-cron";
import { Schedule, Templates } from "./config";
import { log, logError } from "./logger";

const tasks: cron.ScheduledTask[] = [];

export function startScheduler(bot: Bot, chatId: string, schedule: Schedule, templates: Templates): void {
  for (const entry of schedule.engagementMessages) {
    if (!entry.enabled) continue;

    const template = templates.engagement[entry.template];
    if (!template) {
      logError("Scheduler", new Error(`template not found: ${entry.template}`));
      continue;
    }

    const dayOfWeek = entry.cronDayOfWeek !== undefined ? entry.cronDayOfWeek : "*";
    const cronExpression = `${entry.cronMinute} ${entry.cronHour} * * ${dayOfWeek}`;

    const task = cron.schedule(cronExpression, () => {
      log("Scheduler", `sending engagement message: ${entry.id}`);
      bot.api.sendMessage(chatId, template).catch((err) => {
        logError("Scheduler", err);
      });
    }, {
      timezone: schedule.timezone || "UTC",
    });

    tasks.push(task);
    log("Scheduler", `scheduled "${entry.id}" at cron: ${cronExpression} (${schedule.timezone})`);
  }

  log("Scheduler", `started with ${tasks.length} scheduled messages`);
}

export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  log("Scheduler", "stopped");
}
