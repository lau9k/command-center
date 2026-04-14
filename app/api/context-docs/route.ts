import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { withErrorHandler } from "@/lib/api-error-handler";
import { listContextDocs, saveContextDoc } from "@/lib/personize/context-docs";
import { saveContextDocSchema } from "@/lib/validations";

/** GET /api/context-docs — list all context docs */
export const GET = withErrorHandler(
  withAuth(async function GET(_request) {
    const result = await listContextDocs();
    return NextResponse.json(result);
  })
);

/** POST /api/context-docs — create or update a context doc */
export const POST = withErrorHandler(
  withAuth(async function POST(request: NextRequest) {
    const body: unknown = await request.json();
    const parsed = saveContextDocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await saveContextDoc(parsed.data);
    return NextResponse.json(result, { status: parsed.data.id ? 200 : 201 });
  })
);
