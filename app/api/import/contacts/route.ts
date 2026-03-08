import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ImportContactsBody {
  filename: string;
  mapped_data: Record<string, string | null>[];
  field_mapping: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportContactsBody;

    if (!body.filename || !Array.isArray(body.mapped_data) || body.mapped_data.length === 0) {
      return NextResponse.json(
        { error: "filename and non-empty mapped_data array are required" },
        { status: 400 }
      );
    }

    if (!body.field_mapping || typeof body.field_mapping !== "object") {
      return NextResponse.json(
        { error: "field_mapping object is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("imports")
      .insert({
        filename: body.filename,
        record_count: body.mapped_data.length,
        status: "complete",
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
