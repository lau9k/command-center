import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

const outreachRequestSchema = z.object({
  sponsor_ids: z.array(z.string().uuid()).min(1, "At least one sponsor required"),
  template_id: z.string().min(1),
  subject_template: z.string().min(1).max(500),
  body_template: z.string().min(1).max(10000),
});

const patchOutreachStatusSchema = z.object({
  sponsor_id: z.string().uuid(),
  outreach_status: z.enum(["draft", "sent", "replied", "converted"]),
});

function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("outreach_status");

  const supabase = createServiceClient();

  let query = supabase
    .from("sponsors")
    .select("*")
    .order("name", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("outreach_status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = outreachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sponsor_ids, subject_template, body_template } = parsed.data;

  const supabase = createServiceClient();

  const { data: sponsors, error } = await supabase
    .from("sponsors")
    .select("id, name, contact_name, contact_email, tier, status, amount, currency")
    .in("id", sponsor_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sponsors || sponsors.length === 0) {
    return NextResponse.json(
      { error: "No sponsors found for the given IDs" },
      { status: 404 }
    );
  }

  const drafts = sponsors.map((sponsor) => {
    const variables: Record<string, string> = {
      sponsor_name: sponsor.name,
      contact_name: sponsor.contact_name ?? "there",
      contact_email: sponsor.contact_email ?? "",
      tier: sponsor.tier,
      status: sponsor.status,
      amount: Number(sponsor.amount).toLocaleString("en-US", {
        style: "currency",
        currency: sponsor.currency ?? "USD",
      }),
    };

    return {
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      contactName: sponsor.contact_name,
      contactEmail: sponsor.contact_email,
      subject: interpolate(subject_template, variables),
      body: interpolate(body_template, variables),
    };
  });

  return NextResponse.json({ data: drafts });
});

export const PATCH = withErrorHandler(async function PATCH(request: NextRequest) {
  const body = await request.json();

  const parsed = patchOutreachStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sponsor_id, outreach_status } = parsed.data;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("sponsors")
    .update({ outreach_status, updated_at: new Date().toISOString() })
    .eq("id", sponsor_id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
});
