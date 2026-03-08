import { NextRequest, NextResponse } from "next/server";
import { smartDigest } from "@/lib/personize/actions";

export async function GET(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email") ?? undefined;
  const recordId = searchParams.get("record_id") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const tokenBudget = searchParams.get("token_budget");

  if (!email && !recordId) {
    return NextResponse.json(
      { error: "email or record_id parameter is required" },
      { status: 400 }
    );
  }

  try {
    const result = await smartDigest(type ?? "Contact", {
      email,
      record_id: recordId,
      token_budget: tokenBudget ? parseInt(tokenBudget, 10) : 1000,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[API] /api/personize/digest failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
