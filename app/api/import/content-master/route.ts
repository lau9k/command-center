import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ContentRow {
  Title?: string;
  Brand?: string;
  "Content Type"?: string;
  "Core Message"?: string;
  Tone?: string;
  Status?: string;
  "Week Of"?: string;
  [key: string]: string | undefined;
}

const BRAND_SLUG_MAP: Record<string, string> = {
  meek: "meek",
  personize: "personize",
};

function mapStatus(raw: string | undefined): string {
  if (!raw) return "draft";
  const lower = raw.trim().toLowerCase();
  const valid = ["draft", "ready", "scheduled", "published", "failed"];
  return valid.includes(lower) ? lower : "draft";
}

function parseDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: ContentRow[];
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

    // Build brand → project_id lookup
    const brandProjectMap = new Map<string, string>();
    for (const [keyword, slug] of Object.entries(BRAND_SLUG_MAP)) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .single();

      if (project) {
        brandProjectMap.set(keyword, project.id);
      }
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      try {
        const title = row.Title?.trim();
        if (!title) {
          skipped++;
          continue;
        }

        // Resolve project from Brand column, fall back to caller's project_id
        const brandKey = row.Brand?.trim()?.toLowerCase() || "";
        const projectId = brandProjectMap.get(brandKey) || body.project_id;

        const metadata: Record<string, unknown> = {};
        if (row["Content Type"]?.trim())
          metadata.content_type = row["Content Type"].trim();
        if (row.Tone?.trim()) metadata.tone = row.Tone.trim();

        const { error } = await supabase.from("content_posts").insert({
          project_id: projectId,
          user_id: body.user_id,
          title,
          caption: row["Core Message"]?.trim() || null,
          status: mapStatus(row.Status),
          scheduled_at: parseDate(row["Week Of"]),
          metadata,
        });

        if (error) throw new Error(error.message);
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
