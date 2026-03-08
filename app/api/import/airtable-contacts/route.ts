import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ContactRow {
  Name?: string;
  Email?: string;
  "LinkedIn URL"?: string;
  Company?: string;
  Title?: string;
  Category?: string;
  "ICP Fit"?: string;
  "Qualification Signals"?: string;
  "Relationship Stage"?: string;
  Source?: string;
  "Priority Score"?: string;
  Headline?: string;
  [key: string]: string | undefined;
}

function mapRelationshipStage(stage: string | undefined): string | null {
  if (!stage) return null;
  const lower = stage.trim().toLowerCase();
  if (lower === "new") return "lead";
  return lower;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: ContactRow[];
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
        if (row.Title?.trim()) metadata.title = row.Title.trim();
        if (row.Category?.trim()) metadata.category = row.Category.trim();
        if (row["ICP Fit"]?.trim()) metadata.icp_fit = row["ICP Fit"].trim();
        if (row["Qualification Signals"]?.trim())
          metadata.qualification_signals =
            row["Qualification Signals"].trim();
        if (row["Priority Score"]?.trim())
          metadata.priority_score = row["Priority Score"].trim();
        if (row.Headline?.trim()) metadata.headline = row.Headline.trim();

        const contactData = {
          project_id: body.project_id,
          user_id: body.user_id,
          name,
          email,
          linkedin_url: row["LinkedIn URL"]?.trim() || null,
          company: row.Company?.trim() || null,
          qualified_status: mapRelationshipStage(row["Relationship Stage"]),
          source: row.Source?.trim()?.toLowerCase() || null,
          metadata,
        };

        if (email) {
          // Upsert on email within project
          const { error } = await supabase
            .from("contacts")
            .upsert(contactData, {
              onConflict: "project_id,email",
              ignoreDuplicates: false,
            });

          if (error) throw new Error(error.message);
        } else {
          // No email — just insert
          const { error } = await supabase
            .from("contacts")
            .insert(contactData);

          if (error) throw new Error(error.message);
        }

        imported++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
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
