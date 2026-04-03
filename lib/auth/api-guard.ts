import { NextRequest, NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type AuthenticatedHandler = (
  request: NextRequest,
  user: User,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with session-based authentication.
 * Returns 401 if no valid session exists; otherwise passes the
 * authenticated user to the wrapped handler.
 *
 * Composes with withErrorHandler:
 *   export const GET = withErrorHandler(withAuth(async (req, user) => { ... }))
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (request, context) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, user, context);
  };
}
