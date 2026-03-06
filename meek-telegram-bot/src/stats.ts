import { log } from "./logger";

interface DailyStats {
  date: string;
  messageCount: number;
  activeUsers: Set<number>;
}

let dailyStats: DailyStats = {
  date: todayString(),
  messageCount: 0,
  activeUsers: new Set(),
};

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function ensureToday(): void {
  const today = todayString();
  if (dailyStats.date !== today) {
    log("Stats", `resetting daily stats for ${today}`);
    dailyStats = { date: today, messageCount: 0, activeUsers: new Set() };
  }
}

export function trackMessage(userId?: number): void {
  ensureToday();
  dailyStats.messageCount++;
  if (userId) {
    dailyStats.activeUsers.add(userId);
  }
}

export function getStats(): { messagesToday: number; activeUsersToday: number } {
  ensureToday();
  return {
    messagesToday: dailyStats.messageCount,
    activeUsersToday: dailyStats.activeUsers.size,
  };
}
