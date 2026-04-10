import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { smartRecall } from "@/lib/personize/actions";

type QualityRating = "empty" | "stale" | "partial" | "good";

interface RecallTestResponse {
  email: string;
  wordCount: number;
  quality: QualityRating;
  answer: string | null;
  recordCount: number;
}

function assessQuality(
  answer: string | null,
  recordCount: number
): QualityRating {
  if (!answer && recordCount === 0) return "empty";

  const wordCount = (answer ?? "").split(/\s+/).filter(Boolean).length;

  if (wordCount < 10 && recordCount === 0) return "empty";
  if (wordCount < 30 || recordCount <= 1) return "stale";
  if (wordCount < 80) return "partial";
  return "good";
}

export const POST = withErrorHandler(
  withAuth(async function POST(request: NextRequest) {
    const body = (await request.json()) as { email?: string };

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    const result = await smartRecall(
      "Give me a comprehensive summary of everything you know about this contact.",
      { email, responseDetail: "full" }
    );

    const answer = result?.answer ?? null;
    const recordCount = result?.records?.length ?? 0;
    const wordCount = (answer ?? "").split(/\s+/).filter(Boolean).length;
    const quality = assessQuality(answer, recordCount);

    const data: RecallTestResponse = {
      email,
      wordCount,
      quality,
      answer,
      recordCount,
    };

    return NextResponse.json({ data });
  })
);
