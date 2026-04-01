import { NextRequest, NextResponse } from "next/server";
import { createTaskSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { getTasks, createTask } from "@/lib/api/tasks";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  try {
    const data = await getTasks({
      projectId: searchParams.get("project") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      contactId: searchParams.get("contact_id") ?? undefined,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? "Internal server error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await createTask(parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? "Internal server error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
