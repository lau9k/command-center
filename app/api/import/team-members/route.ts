import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const teamMembersImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string().nullable().optional()))
    .min(1, "non-empty rows array is required"),
  project_id: z.string().uuid(),
  user_id: z.string().min(1),
});

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

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  try {
    const raw = await request.json();
    const parsed = teamMembersImportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data as {
      rows: TeamMemberRow[];
      project_id: string;
      user_id: string;
    };

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
});
