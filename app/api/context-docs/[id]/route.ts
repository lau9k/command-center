import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { withErrorHandler } from "@/lib/api-error-handler";
import {
  getContextDoc,
  deleteContextDoc,
} from "@/lib/personize/context-docs";

/** GET /api/context-docs/[id] — get a single context doc */
export const GET = withErrorHandler(
  withAuth(async function GET(
    _request: NextRequest,
    _user,
    context
  ) {
    const { id } = await context!.params;

    const doc = await getContextDoc(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ doc });
  })
);

/** DELETE /api/context-docs/[id] — delete a context doc */
export const DELETE = withErrorHandler(
  withAuth(async function DELETE(
    _request: NextRequest,
    _user,
    context
  ) {
    const { id } = await context!.params;

    const result = await deleteContextDoc(id);
    return NextResponse.json(result);
  })
);
