import { NextRequest, NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";

export async function GET(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const type = searchParams.get("type") ?? undefined;
  const email = searchParams.get("email") ?? undefined;

  if (!query) {
    return NextResponse.json(
      { error: "q (query) parameter is required" },
      { status: 400 }
    );
  }

  try {
    const result = await smartRecall(query, {
      email,
      ...(type ? { collectionIds: undefined } : {}),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[API] /api/personize/recall failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
