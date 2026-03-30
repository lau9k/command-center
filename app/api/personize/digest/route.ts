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
    const response = await client.memory.smartRecall({
      query: message,
      message,
      ...(email ? { email } : {}),
      ...(recordId ? { record_id: recordId } : {}),
      include_property_values: true,
      mode: "deep",
      generate_answer: true,
      ...(tokenBudget
        ? { token_budget: parseInt(tokenBudget, 10) }
        : { token_budget: 1000 }),
    } as Parameters<typeof client.memory.smartRecall>[0]);

    return NextResponse.json({ data: response.data });
  } catch (error) {
    console.error("[API] /api/personize/digest failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
