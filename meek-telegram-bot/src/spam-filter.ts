import { Context } from "grammy";
import { SpamPatterns } from "./config";
import { log } from "./logger";

const memberJoinTimes = new Map<number, number>();

export function recordMemberJoin(userId: number): void {
  memberJoinTimes.set(userId, Date.now());
}

function isNewMember(userId: number, blockDurationMinutes: number): boolean {
  const joinTime = memberJoinTimes.get(userId);
  if (!joinTime) return false;
  return Date.now() - joinTime < blockDurationMinutes * 60 * 1000;
}

function hasExcessiveCaps(text: string, maxPercentage: number, minLength: number): boolean {
  if (text.length < minLength) return false;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return false;
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  return (upperCount / letters.length) * 100 > maxPercentage;
}

function containsSpamKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function matchesSpamPattern(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new RegExp(pattern, "i").test(text));
}

function hasLink(text: string): boolean {
  return /https?:\/\/\S+|t\.me\/\S+|@\w+/i.test(text);
}

export async function checkSpam(ctx: Context, spamConfig: SpamPatterns): Promise<boolean> {
  const text = ctx.message?.text || ctx.message?.caption || "";
  const userId = ctx.from?.id;
  if (!text || !userId) return false;

  // New members can't post links
  if (
    isNewMember(userId, spamConfig.newMemberLinkBlockDurationMinutes) &&
    hasLink(text)
  ) {
    log("Spam filter", `blocked link from new member ${userId}`);
    await ctx.deleteMessage().catch(() => {});
    return true;
  }

  // Keyword check
  if (containsSpamKeyword(text, spamConfig.keywords)) {
    log("Spam filter", `blocked spam keyword from ${userId}: ${text.substring(0, 50)}`);
    await ctx.deleteMessage().catch(() => {});
    return true;
  }

  // Pattern check
  if (matchesSpamPattern(text, spamConfig.patterns)) {
    log("Spam filter", `blocked spam pattern from ${userId}: ${text.substring(0, 50)}`);
    await ctx.deleteMessage().catch(() => {});
    return true;
  }

  // Excessive caps
  if (hasExcessiveCaps(text, spamConfig.maxCapsPercentage, spamConfig.minMessageLengthForCapsCheck)) {
    log("Spam filter", `blocked excessive caps from ${userId}: ${text.substring(0, 50)}`);
    await ctx.deleteMessage().catch(() => {});
    return true;
  }

  return false;
}
