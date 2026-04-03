import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with session-based authentication.
 * Returns 401 if no valid session exists; otherwise delegates to the handler.
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context);
  };
}
