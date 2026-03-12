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

function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

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
