import * as fs from "fs";
import * as path from "path";

export interface Templates {
  welcome: { message: string };
  engagement: Record<string, string>;
}

export interface SpamPatterns {
  keywords: string[];
  patterns: string[];
  newMemberLinkBlockDurationMinutes: number;
  maxCapsPercentage: number;
  minMessageLengthForCapsCheck: number;
}

export interface ScheduleEntry {
  id: string;
  template: string;
  cronHour: number;
  cronMinute: number;
  cronDayOfWeek?: number;
  enabled: boolean;
}

export interface Schedule {
  engagementMessages: ScheduleEntry[];
  milestoneCheckIntervalMinutes: number;
  timezone: string;
}

function loadJson<T>(filename: string): T {
  const filePath = path.resolve(process.cwd(), "config", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function loadTemplates(): Templates {
  return loadJson<Templates>("templates.json");
}

export function loadSpamPatterns(): SpamPatterns {
  return loadJson<SpamPatterns>("spam-patterns.json");
}

export function loadSchedule(): Schedule {
  return loadJson<Schedule>("schedule.json");
}

export function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAdminUserIds(): number[] {
  const raw = process.env.ADMIN_USER_IDS || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));
}
