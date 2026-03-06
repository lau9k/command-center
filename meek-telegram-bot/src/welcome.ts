import { Context } from "grammy";
import { Templates } from "./config";
import { recordMemberJoin } from "./spam-filter";
import { log } from "./logger";
import { trackMessage } from "./stats";

export async function handleNewMember(ctx: Context, templates: Templates): Promise<void> {
  const newMembers = ctx.message?.new_chat_members;
  if (!newMembers || newMembers.length === 0) return;

  for (const member of newMembers) {
    if (member.is_bot) continue;

    recordMemberJoin(member.id);

    const name = member.first_name || member.username || "friend";
    const message = templates.welcome.message.replace("{name}", name);

    log("Welcome", `new member: ${name} (${member.id})`);
    const sent = await ctx.reply(message);
    trackMessage(sent.from?.id);
  }
}
