import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface HackathonRow {
  Name?: string;
  Email?: string;
  LinkedIn?: string;
  Role?: string;
  "AI Experience"?: string;
  "Solo or Partner"?: string;
  "Confirmation Status"?: string;
  Source?: string;
  Event?: string;
  "Applied Date"?: string;
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: HackathonRow[];
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

    // Look up Hackathons project
    const { data: hackathonProject } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", "hackathons")
      .limit(1)
      .single();

    const hackathonProjectId = hackathonProject?.id || body.project_id;

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
        if (row["AI Experience"]?.trim())
          metadata.ai_experience = row["AI Experience"].trim();
        if (row["Solo or Partner"]?.trim())
          metadata.team_preference = row["Solo or Partner"].trim();
        if (row["Confirmation Status"]?.trim())
          metadata.confirmation_status = row["Confirmation Status"].trim();
        if (row.Event?.trim()) metadata.event = row.Event.trim();
        if (row["Applied Date"]?.trim())
          metadata.applied_date = row["Applied Date"].trim();

        const contactData = {
          project_id: hackathonProjectId,
          user_id: body.user_id,
          name,
          email,
          linkedin_url: row.LinkedIn?.trim() || null,
          source: row.Source?.trim()?.toLowerCase() || null,
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
