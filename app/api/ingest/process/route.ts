import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { processUnprocessedEvents } from "@/lib/ingest/processor";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.API_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await processUnprocessedEvents();

  return NextResponse.json({ success: true, ...result }, { status: 200 });
});
