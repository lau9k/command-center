import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { recallContacts } from "@/lib/personize/actions";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const query = request.nextUrl.searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const contacts = await recallContacts(query.trim());

  return NextResponse.json({
    data: contacts,
    query: query.trim(),
    total: contacts.length,
  });
});
