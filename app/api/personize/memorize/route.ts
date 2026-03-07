import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/personize/client";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.API_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, tags, collectionId } = await request.json();

    if (!content || !tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: "content (string) and tags (non-empty array) are required" },
        { status: 400 }
      );
    }

    const response = await client.memory.memorize({
      content,
      tags,
      enhanced: true,
      ...(collectionId ? { collectionIds: [collectionId] } : {}),
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    console.error("[API] /api/personize/memorize failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
