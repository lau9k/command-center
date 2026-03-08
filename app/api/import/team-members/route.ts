import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface TeamMemberRow {
  Name?: string;
  Role?: string;
  Email?: string;
  "Project Assignment"?: string;
  Status?: string;
  Skills?: string;
  Notes?: string;
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: TeamMemberRow[];
      project_id: string;
      user_id: string;
    };

    if (!body.rows || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { error: "rows array is required" },
        { status: 400 }
      );
    }

    if (!body.project_id || !body.user_id) {
      return NextResponse.json(
        { error: "project_id and user_id are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      try {
        const name = row.Name?.trim();
        if (!name) {
          skipped++;
          continue;
        }

        const email = row.Email?.trim() || null;

        const metadata: Record<string, unknown> = {};
        if (row.Role?.trim()) metadata.role = row.Role.trim();
        if (row["Project Assignment"]?.trim())
          metadata.project_assignment = row["Project Assignment"].trim();
        if (row.Status?.trim()) metadata.status = row.Status.trim();
        if (row.Skills?.trim()) metadata.skills = row.Skills.trim();
        if (row.Notes?.trim()) metadata.notes = row.Notes.trim();

        const contactData = {
          project_id: body.project_id,
          user_id: body.user_id,
          name,
          email,
          source: "team" as const,
          metadata,
        };

        if (email) {
          const { error } = await supabase
            .from("contacts")
            .upsert(contactData, {
              onConflict: "project_id,email",
              ignoreDuplicates: false,
            });

          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("contacts").insert(contactData);

          if (error) throw new Error(error.message);
        }

        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
