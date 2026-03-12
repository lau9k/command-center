import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { encrypt } from "@/lib/gmail-crypto";

const connectAccountSchema = z.object({
  email_address: z.string().email().max(500),
  refresh_token: z.string().min(1),
});

const disconnectAccountSchema = z.object({
  account_id: z.string().uuid(),
});

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("gmail_accounts")
    .select("id, email_address, status, history_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = connectAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if account already exists
  const { data: existing } = await supabase
    .from("gmail_accounts")
    .select("id, status")
    .eq("email_address", parsed.data.email_address)
    .single();

  if (existing) {
    // Reactivate if inactive, update token
    await supabase
      .from("gmail_accounts")
      .update({
        refresh_token_encrypted: encrypt(parsed.data.refresh_token),
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return NextResponse.json({
      data: { id: existing.id, email_address: parsed.data.email_address, status: "active" },
      reactivated: existing.status === "inactive",
    });
  }

  const { data, error } = await supabase
    .from("gmail_accounts")
    .insert({
      email_address: parsed.data.email_address,
      refresh_token_encrypted: encrypt(parsed.data.refresh_token),
      status: "active",
    })
    .select("id, email_address, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});

export const DELETE = withErrorHandler(async function DELETE(request: NextRequest) {
  const body = await request.json();

  const parsed = disconnectAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("gmail_accounts")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.account_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
