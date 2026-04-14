import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/personize/client";
import { memorizeSchema as baseMemorizeSchema } from "@/lib/validations";

const memorizeSchema = baseMemorizeSchema.extend({
  email: z.string().email().optional(),
});

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
    const body = await request.json();
    const parsed = memorizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { content, collectionId, email } = parsed.data;

    const response = await client.memory.save({
      content,
      ...(collectionId ? { collectionIds: [collectionId] } : {}),
      ...(email ? { email } : {}),
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
