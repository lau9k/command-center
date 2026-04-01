import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateContactSchema } from "@/lib/validations";
import { getContactById } from "@/lib/personize/actions";
import { syncToPersonize } from "@/lib/personize/sync";
import {
  getContact,
  updateContact,
  deleteContact,
} from "@/lib/api/contacts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const source = request.nextUrl.searchParams.get("source");

  // If the ID looks like a Personize record ID (starts with "REC#" or is a long string),
  // try Personize first
  const isPersonizeRecord = id.startsWith("REC#") || id.length > 36;

  if (isPersonizeRecord && process.env.PERSONIZE_SECRET_KEY && source !== "supabase") {
    try {
      const result = await getContactById(id);
      if (result) {
        return NextResponse.json({
          data: result.contact,
          summary: result.summary,
          source: "personize",
        });
      }
    } catch (error) {
      console.error("[API] GET /api/contacts/[id] Personize error:", error);
      // Fall through to Supabase
    }
  }

  // Supabase fallback
  const supabase = createServiceClient();
  const data = await getContact(supabase, id);

  if (!data) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ data, source: "supabase" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = await updateContact(supabase, id, parsed.data);

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = await updateContact(supabase, id, parsed.data);

  // Sync to Personize in the background — don't block the response
  syncToPersonize({
    table: "contacts",
    recordId: data.id,
    content: JSON.stringify(data),
    email: data.email ?? undefined,
  }).catch((err) => {
    console.error("[API] PATCH /api/contacts/[id] sync error:", err);
  });

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  await deleteContact(supabase, id);

  return NextResponse.json({ success: true });
}
