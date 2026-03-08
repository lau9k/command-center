import { NextRequest, NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("email, name")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  if (!contact.email) {
    return NextResponse.json(
      { error: "Contact has no email — cannot query Personize" },
      { status: 422 }
    );
  }

  try {
    const result = await smartRecall(contact.name, {
      email: contact.email,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/memory failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
