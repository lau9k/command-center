import "server-only";
import { memorize } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GmailHeader {
  name?: string | null;
  value?: string | null;
}

export interface GmailMessagePayload {
  headers?: GmailHeader[];
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePayload[];
}

export interface GmailMessage {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
  // Top-level header fields (n8n simple:false sometimes hoists these)
  From?: string;
  To?: string;
  Subject?: string;
  Date?: string;
  [key: string]: unknown;
}

export interface BatchResult {
  processed: number;
  skipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Header lookup — ported verbatim from n8n Session 065 canonical version
// ---------------------------------------------------------------------------

export function headerLookup(
  email: GmailMessage,
  name: string
): string {
  const payloadHeaders = email.payload?.headers || [];
  const pl = payloadHeaders.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  if (pl?.value) return pl.value;

  // Fallback: check top-level capitalized key (e.g. email.From)
  const cap = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const capVal = email[cap];
  if (typeof capVal === "string" && capVal) return capVal;

  // Fallback: check top-level lowercase key
  const lowerVal = email[name.toLowerCase()];
  if (typeof lowerVal === "string" && lowerVal) return lowerVal;

  return "";
}

// ---------------------------------------------------------------------------
// Body decode
// ---------------------------------------------------------------------------

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractBody(payload?: GmailMessagePayload): string {
  if (!payload) return "";

  // Direct body data
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — prefer text/plain, fall back to text/html
  if (payload.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === "text/plain"
    );
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (p) => p.mimeType === "text/html"
    );
    if (htmlPart?.body?.data) {
      return stripHtml(decodeBase64Url(htmlPart.body.data));
    }

    // Nested multipart (e.g. multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .trim();
}

// ---------------------------------------------------------------------------
// Skip rules — automated / transactional emails
// ---------------------------------------------------------------------------

const SKIP_SENDERS = [
  "noreply@",
  "no-reply@",
  "notifications@",
  "mailer-daemon@",
  "postmaster@",
  "do-not-reply@",
  "donotreply@",
  "automated@",
  "alert@",
  "alerts@",
];

const SKIP_DOMAINS = [
  "notify.",
  "updates.",
  "email.",
  "bounce.",
  "transactional.",
];

export function shouldSkip(from: string, subject: string): boolean {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  // Skip known automated senders
  for (const prefix of SKIP_SENDERS) {
    if (lowerFrom.includes(prefix)) return true;
  }

  // Skip transactional subdomains
  const domain = lowerFrom.split("@")[1] ?? "";
  for (const sub of SKIP_DOMAINS) {
    if (domain.startsWith(sub)) return true;
  }

  // Skip obvious automated subjects
  if (
    lowerSubject.includes("unsubscribe") &&
    lowerSubject.includes("click here")
  )
    return true;
  if (lowerSubject.startsWith("automatic reply:")) return true;
  if (lowerSubject.startsWith("auto-reply:")) return true;
  if (lowerSubject.startsWith("out of office:")) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Contact resolution — uses the resolve-contact API internally
// ---------------------------------------------------------------------------

function parseEmailAddress(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, "").trim(),
      email: match[2].trim().toLowerCase(),
    };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

// ---------------------------------------------------------------------------
// Core batch processing
// ---------------------------------------------------------------------------

export async function processGmailBatch(
  emails: GmailMessage[]
): Promise<BatchResult> {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      const from = headerLookup(email, "from");
      const to = headerLookup(email, "to");
      const subject = headerLookup(email, "subject");
      const date = headerLookup(email, "date");

      if (!from) {
        skipped++;
        continue;
      }

      if (shouldSkip(from, subject)) {
        skipped++;
        continue;
      }

      const body = extractBody(email.payload);
      const { name: senderName, email: senderEmail } = parseEmailAddress(from);
      const displayName = senderName || senderEmail;

      // Truncate body for memorization (avoid PII overexposure)
      const truncatedBody = body.slice(0, 2000);

      // Build conversation content for Personize
      const content = [
        `Email from ${displayName} (${senderEmail})`,
        subject ? `Subject: ${subject}` : null,
        date ? `Date: ${date}` : null,
        to ? `To: ${to}` : null,
        truncatedBody ? `\n${truncatedBody}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      // Call Personize memorize
      const success = await memorize(
        content,
        ["email", "gmail", "conversation"],
        senderEmail
      );

      if (success) {
        processed++;
      } else {
        errors.push(
          `Failed to memorize email from ${senderEmail}: Personize returned false`
        );
        processed++; // Still count as processed, error is non-fatal
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error processing email: ${message}`);
      // Don't block on single email failure — continue batch
    }
  }

  return { processed, skipped, errors };
}

// ---------------------------------------------------------------------------
// Sync log helper
// ---------------------------------------------------------------------------

export async function logBatchToSyncLog(
  recordsFound: number,
  result: BatchResult
): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const status =
    result.errors.length > 0
      ? result.processed > 0
        ? "partial"
        : "error"
      : "success";

  const { error: insertError } = await supabase.from("sync_log").insert({
    source: "gmail",
    status,
    started_at: now,
    completed_at: now,
    records_found: recordsFound,
    records_synced: result.processed,
    records_skipped: result.skipped,
    error_message:
      result.errors.length > 0
        ? result.errors.slice(0, 5).join("; ")
        : null,
    metadata: {
      channel: "gmail-batch",
      skipped: result.skipped,
      error_count: result.errors.length,
    },
  });

  if (insertError) {
    console.error("[logBatchToSyncLog] Failed to insert sync_log row:", insertError.message);
  }
}
