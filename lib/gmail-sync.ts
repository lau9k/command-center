import "server-only";
import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/gmail-crypto";
import { logSync } from "@/lib/gmail-sync-log";

interface GmailSyncResult {
  account_id: string;
  email: string;
  added: number;
  updated: number;
  conversations_linked: number;
  error?: string;
}

interface GmailSyncSummary {
  success: boolean;
  synced: number;
  errors: number;
  results: GmailSyncResult[];
}

interface ParsedAddress {
  name: string | null;
  email: string;
}

interface GmailHeader {
  name?: string | null;
  value?: string | null;
}

const hasGmailCredentials = !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  return new google.auth.OAuth2(clientId, clientSecret);
}

function parseEmailAddress(raw: string): ParsedAddress {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, "").trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

function getHeader(headers: GmailHeader[], name: string): string | null {
  const header = headers.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? null;
}

export async function getLastSyncDate(): Promise<string | null> {
  if (!hasGmailCredentials) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "gmail")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  return data?.completed_at ?? null;
}

export async function syncGmail(): Promise<GmailSyncSummary> {
  if (!hasGmailCredentials) {
    return { success: true, synced: 0, errors: 0, results: [] };
  }

  const supabase = createServiceClient();
  const oauth2 = getOAuth2Client();

  // Log sync start
  const logId = await logSync("gmail", "running", 0);

  // Fetch all active Gmail accounts
  const { data: accounts, error: accountsError } = await supabase
    .from("gmail_accounts")
    .select("*")
    .eq("status", "active");

  if (accountsError) {
    if (logId) {
      await updateSyncLog(logId, "error", 0, accountsError.message, { records_found: 0, records_skipped: 0 });
    }
    return { success: false, synced: 0, errors: 1, results: [] };
  }

  if (!accounts || accounts.length === 0) {
    if (logId) {
      await updateSyncLog(logId, "success", 0, undefined, { records_found: 0, records_skipped: 0 });
    }
    return { success: true, synced: 0, errors: 0, results: [] };
  }

  const results: GmailSyncResult[] = [];
  let totalSynced = 0;
  let totalErrors = 0;

  for (const account of accounts) {
    try {
      const refreshToken = decrypt(account.refresh_token_encrypted);
      oauth2.setCredentials({ refresh_token: refreshToken });

      const gmail = google.gmail({ version: "v1", auth: oauth2 });

      const result = await syncAccountMessages(
        supabase,
        gmail,
        account
      );

      totalSynced += result.added + result.updated;
      results.push(result);
    } catch (err) {
      totalErrors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        account_id: account.id,
        email: account.email_address,
        added: 0,
        updated: 0,
        conversations_linked: 0,
        error: message,
      });
    }
  }

  // Update sync log with final status
  if (logId) {
    const status =
      totalErrors > 0
        ? totalSynced > 0
          ? "partial"
          : "error"
        : "success";
    const errorMsg =
      totalErrors > 0
        ? `${totalErrors} account(s) failed to sync`
        : undefined;
    await updateSyncLog(logId, status, totalSynced, errorMsg, { records_found: totalSynced, records_skipped: 0 });
  }

  return {
    success: totalErrors === 0,
    synced: totalSynced,
    errors: totalErrors,
    results,
  };
}

async function syncAccountMessages(
  supabase: ReturnType<typeof createServiceClient>,
  gmail: ReturnType<typeof google.gmail>,
  account: Record<string, unknown>
): Promise<GmailSyncResult> {
  const accountId = account.id as string;
  const emailAddress = account.email_address as string;
  const historyId = account.history_id as string | null;

  let messageIds: string[] = [];

  if (historyId) {
    // Incremental sync using history API
    messageIds = await fetchMessageIdsFromHistory(gmail, historyId);
  } else {
    // Full initial sync — fetch recent messages
    messageIds = await fetchRecentMessageIds(gmail);
  }

  if (messageIds.length === 0) {
    return {
      account_id: accountId,
      email: emailAddress,
      added: 0,
      updated: 0,
      conversations_linked: 0,
    };
  }

  // Deduplicate
  const uniqueIds = [...new Set(messageIds)];

  let added = 0;
  let updated = 0;
  let conversationsLinked = 0;
  let latestHistoryId = historyId;

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);

    for (const msgId of batch) {
      const { data: msg } = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      if (!msg?.id || !msg.threadId) continue;

      const headers: GmailHeader[] =
        (msg.payload?.headers as GmailHeader[]) ?? [];
      const fromRaw = getHeader(headers, "From") ?? "";
      const toRaw = getHeader(headers, "To") ?? "";
      const subject = getHeader(headers, "Subject");
      const dateStr = getHeader(headers, "Date");

      const from = parseEmailAddress(fromRaw);
      const toAddresses = toRaw
        .split(",")
        .map((a) => parseEmailAddress(a.trim()))
        .filter((a) => a.email);

      const messageDate = dateStr ? new Date(dateStr).toISOString() : null;
      const labelIds = (msg.labelIds ?? []) as string[];
      const isUnread = labelIds.includes("UNREAD");

      // Track latest history ID for cursor
      if (msg.historyId) {
        if (
          !latestHistoryId ||
          BigInt(msg.historyId) > BigInt(latestHistoryId)
        ) {
          latestHistoryId = msg.historyId;
        }
      }

      // Upsert the message
      const { data: existing } = await supabase
        .from("gmail_messages")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .single();

      const row = {
        gmail_account_id: accountId,
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId,
        subject,
        snippet: msg.snippet ?? null,
        from_address: from.email,
        from_name: from.name,
        to_addresses: toAddresses,
        date: messageDate,
        label_ids: labelIds,
        is_unread: isUnread,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from("gmail_messages")
          .update(row)
          .eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("gmail_messages").insert(row);
        added++;
      }

      // Link to conversation by thread — find or create
      const linked = await linkToConversation(
        supabase,
        msg.threadId,
        accountId,
        subject,
        messageDate,
        from,
        toAddresses,
        emailAddress
      );
      if (linked) conversationsLinked++;
    }
  }

  // Update cursor
  if (latestHistoryId) {
    await supabase
      .from("gmail_accounts")
      .update({ history_id: latestHistoryId, updated_at: new Date().toISOString() })
      .eq("id", accountId);
  }

  return {
    account_id: accountId,
    email: emailAddress,
    added,
    updated,
    conversations_linked: conversationsLinked,
  };
}

async function fetchMessageIdsFromHistory(
  gmail: ReturnType<typeof google.gmail>,
  startHistoryId: string
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const { data } = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        pageToken,
      });

      if (data.history) {
        for (const h of data.history) {
          if (h.messagesAdded) {
            for (const m of h.messagesAdded) {
              if (m.message?.id) {
                ids.push(m.message.id);
              }
            }
          }
        }
      }

      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (err: unknown) {
    // History ID expired — fall back to full sync
    const isHistoryError =
      err instanceof Error &&
      (err.message.includes("historyId") ||
        err.message.includes("404") ||
        err.message.includes("notFound"));
    if (isHistoryError) {
      return fetchRecentMessageIds(gmail);
    }
    throw err;
  }

  return ids;
}

async function fetchRecentMessageIds(
  gmail: ReturnType<typeof google.gmail>,
  maxResults = 200
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let fetched = 0;

  do {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(100, maxResults - fetched),
      pageToken,
      q: "in:inbox OR in:sent",
    });

    if (data.messages) {
      for (const m of data.messages) {
        if (m.id) ids.push(m.id);
      }
      fetched += data.messages.length;
    }

    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken && fetched < maxResults);

  return ids;
}

async function linkToConversation(
  supabase: ReturnType<typeof createServiceClient>,
  threadId: string,
  accountId: string,
  subject: string | null,
  messageDate: string | null,
  from: ParsedAddress,
  toAddresses: ParsedAddress[],
  accountEmail: string
): Promise<boolean> {
  // Check if we already have a conversation for this thread
  const { data: existingMsg } = await supabase
    .from("gmail_messages")
    .select("conversation_id")
    .eq("gmail_thread_id", threadId)
    .not("conversation_id", "is", null)
    .limit(1)
    .single();

  if (existingMsg?.conversation_id) {
    // Update last_message_at on the existing conversation
    if (messageDate) {
      await supabase
        .from("conversations")
        .update({ last_message_at: messageDate, updated_at: new Date().toISOString() })
        .eq("id", existingMsg.conversation_id)
        .lt("last_message_at", messageDate);
    }

    // Link this message to the same conversation
    await supabase
      .from("gmail_messages")
      .update({ conversation_id: existingMsg.conversation_id })
      .eq("gmail_thread_id", threadId)
      .is("conversation_id", null);

    return false; // Not a new conversation link
  }

  // Determine the external contact (not the account owner)
  const externalEmail =
    from.email.toLowerCase() !== accountEmail.toLowerCase()
      ? from.email
      : toAddresses.find(
          (a) => a.email.toLowerCase() !== accountEmail.toLowerCase()
        )?.email ?? null;

  // Try to find a matching contact
  let contactId: string | null = null;
  if (externalEmail) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", externalEmail)
      .limit(1)
      .single();

    contactId = contact?.id ?? null;
  }

  // Create a new conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      contact_id: contactId,
      summary: subject ?? "No subject",
      channel: "email",
      last_message_at: messageDate ?? new Date().toISOString(),
      metadata: {
        gmail_thread_id: threadId,
        gmail_account_id: accountId,
        participants: [from.email, ...toAddresses.map((a) => a.email)],
      },
    })
    .select("id")
    .single();

  if (conversation?.id) {
    // Link all messages in this thread to the conversation
    await supabase
      .from("gmail_messages")
      .update({ conversation_id: conversation.id })
      .eq("gmail_thread_id", threadId);

    return true;
  }

  return false;
}

async function updateSyncLog(
  id: string,
  status: "success" | "error" | "partial",
  recordCount: number,
  error?: string,
  options?: { records_found?: number; records_skipped?: number }
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("sync_log")
    .update({
      status,
      record_count: recordCount,
      records_synced: recordCount,
      records_found: options?.records_found ?? recordCount,
      records_skipped: options?.records_skipped ?? 0,
      completed_at: new Date().toISOString(),
      ...(error ? { error_message: error, message: error } : {}),
    })
    .eq("id", id);
}
