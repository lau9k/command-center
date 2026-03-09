import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

export const runtime = "nodejs";

const importContactsSchema = z.object({
  filename: z.string().min(1, "filename is required").max(500),
  mapped_data: z
    .array(z.record(z.string(), z.string().nullable()))
    .min(1, "non-empty mapped_data array is required"),
  field_mapping: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = importContactsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("imports")
      .insert({
        filename: body.filename,
        record_count: body.mapped_data.length,
        status: "pending",
        mapped_data: body.mapped_data,
        field_mapping: body.field_mapping,
      })
      .select("id, record_count, status")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to save import: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
