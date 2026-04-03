import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const contentImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string().nullable().optional()))
    .min(1, "non-empty rows array is required"),
  project_id: z.string().uuid(),
  user_id: z.string().min(1),
});

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

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  try {
    const raw = await request.json();
    const parsed = contentImportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data as {
      rows: ContentRow[];
      project_id: string;
      user_id: string;
    };

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
});
