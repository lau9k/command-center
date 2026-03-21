import { NextRequest, NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { SmartRecallResult } from "@/lib/personize/types";

type GovernanceStatus = "BLOCKED" | "HANDLE_WITH_CARE" | "CLEAR";

interface GovernanceResult {
  status: GovernanceStatus;
  note?: string;
}

const MAX_EMAILS = 20;

function parseGovernanceFromRecall(
  result: SmartRecallResult | null
): GovernanceResult {
  if (!result?.memories?.length) {
    return { status: "CLEAR" };
  }

  for (const mem of result.memories) {
    const text = mem.text.toUpperCase();

    if (text.includes("OUTREACH STATUS: BLOCKED") || text.includes("OUTREACH_STATUS: BLOCKED")) {
      return { status: "BLOCKED", note: mem.text };
    }
    if (text.includes("OUTREACH STATUS: HANDLE_WITH_CARE") || text.includes("OUTREACH_STATUS: HANDLE_WITH_CARE")) {
      return { status: "HANDLE_WITH_CARE", note: mem.text };
    }
  }

  // Check properties on memories (some may carry structured data)
  for (const mem of result.memories) {
    const text = mem.text.toUpperCase();
    if (text.includes("BLOCKED")) {
      return { status: "BLOCKED", note: mem.text };
    }
    if (text.includes("HANDLE WITH CARE") || text.includes("HANDLE_WITH_CARE")) {
      return { status: "HANDLE_WITH_CARE", note: mem.text };
    }
  }

  return { status: "CLEAR" };
}

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const emails: unknown = body?.emails;

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: "emails must be a non-empty array" },
      { status: 400 }
    );
  }

  if (emails.length > MAX_EMAILS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_EMAILS} emails per request` },
      { status: 400 }
    );
  }

  const validEmails = emails.filter(
    (e): e is string => typeof e === "string" && e.includes("@")
  );

  const settled = await Promise.allSettled(
    validEmails.map(async (email) => {
      const result = await smartRecall("outreach status governance flags", {
        email,
      });
      return { email, governance: parseGovernanceFromRecall(result) };
    })
  );

  const results: Record<string, GovernanceResult> = {};

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results[outcome.value.email] = outcome.value.governance;
    }
  }

  // Fill in CLEAR for any emails that failed or were filtered
  for (const email of emails) {
    if (typeof email === "string" && !(email in results)) {
      results[email] = { status: "CLEAR" };
    }
  }

  return NextResponse.json({ results });
});
