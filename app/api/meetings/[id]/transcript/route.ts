import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const GRANOLA_API_BASE = "https://api.granola.so/v1";

export const GET = withErrorHandler(
  withAuth(async function GET(
    _request: NextRequest,
    _user,
    context?: { params: Promise<Record<string, string>> }
  ) {
    const params = await context!.params;
    const meetingId = params.id;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up the meeting to get granola_id
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("granola_id")
      .eq("id", meetingId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!meeting || !meeting.granola_id) {
      return NextResponse.json({ transcript: "" });
    }

    // Fetch transcript from Granola API
    const apiKey = process.env.GRANOLA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ transcript: "" });
    }

    try {
      const res = await fetch(
        `${GRANOLA_API_BASE}/meetings/${meeting.granola_id}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!res.ok) {
        return NextResponse.json({ transcript: "" });
      }

      const detail = (await res.json()) as { transcript?: string };
      return NextResponse.json({ transcript: detail.transcript ?? "" });
    } catch {
      return NextResponse.json({ transcript: "" });
    }
  })
);
