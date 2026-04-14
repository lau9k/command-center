import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/personize/client";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withAuth(async function GET(request: NextRequest, _user) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email") ?? undefined;
  const recordId = searchParams.get("record_id") ?? undefined;
  const tokenBudget = searchParams.get("token_budget");

  if (!email && !recordId) {
    return NextResponse.json(
      { error: "email or record_id parameter is required" },
      { status: 400 }
    );
  }

  try {
    const message = "full context digest";
    const response = await client.memory.retrieve({
      message,
      ...(email ? { email } : {}),
      ...(recordId ? { recordId } : {}),
      mode: "deep",
      generateAnswer: true,
      tokenBudget: tokenBudget ? parseInt(tokenBudget, 10) : 1000,
    });

    return NextResponse.json({ data: response.data });
  } catch (error) {
    console.error("[API] /api/personize/digest failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
