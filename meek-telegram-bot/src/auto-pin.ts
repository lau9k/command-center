import { Context } from "grammy";
import { log } from "./logger";

const X_URL_PATTERN = /https?:\/\/(twitter\.com|x\.com)\/\S+/i;

function getApprovedPinners(): number[] {
  const raw = process.env.APPROVED_PINNERS || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function isApprovedPinner(userId: number): boolean {
  const approved = getApprovedPinners();
  return approved.includes(userId);
}

export function containsXLink(text: string): boolean {
  return X_URL_PATTERN.test(text);
}

export async function handleAutoPin(ctx: Context): Promise<void> {
  const text = ctx.message?.text || ctx.message?.caption || "";
  const userId = ctx.from?.id;
  if (!text || !userId) return;

  if (!containsXLink(text)) return;
  if (!isApprovedPinner(userId)) {
    log("AutoPin", `X link from non-approved user ${userId}, skipping pin`);
    return;
  }

  const messageId = ctx.message?.message_id;
  if (!messageId) return;

  try {
    await ctx.api.pinChatMessage(ctx.chat!.id, messageId);
    log("AutoPin", `pinned message ${messageId} from user ${userId} (X link detected)`);
  } catch (error) {
    log("AutoPin", `failed to pin message ${messageId}: ${error}`);
  }
}
