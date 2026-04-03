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
  const query = searchParams.get("q");
  const email = searchParams.get("email") ?? undefined;
  const responseDetail = (searchParams.get("response_detail") ?? "summary") as
    | "ids" | "labels" | "summary" | "context" | "full";

  if (!query) {
    return NextResponse.json(
      { error: "q (query) parameter is required" },
      { status: 400 }
    );
  }

  try {
    const smartRecallUnified = (client as unknown as {
      smartRecallUnified: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    }).smartRecallUnified;

    const response = await smartRecallUnified({
      message: query,
      ...(email ? { identifiers: { emails: [email] } } : {}),
      responseDetail,
    });

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("[API] /api/personize/recall failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
