import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/personize/client";

export async function GET(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const email = searchParams.get("email") ?? undefined;
  const sessionId = searchParams.get("session_id") ?? undefined;
  const responseDetail = searchParams.get("response_detail") ?? undefined;

  if (!query) {
    return NextResponse.json(
      { error: "q (query) parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await client.memory.smartRecall({
      query,
      message: query,
      ...(email ? { email } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(responseDetail ? { response_detail: responseDetail } : {}),
      fast_mode: true,
      min_score: 0.3,
    } as Parameters<typeof client.memory.smartRecall>[0]);

    return NextResponse.json({ data: response.data });
  } catch (error) {
    console.error("[API] /api/personize/recall failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
