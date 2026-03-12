import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateCSV } from "@/lib/export";

const ALLOWED_TABLES = [
  "tasks",
  "contacts",
  "sponsors",
  "content_posts",
  "pipeline_items",
  "transactions",
  "debts",
  "projects",
] as const;

const ExportParamsSchema = z.object({
  table: z.enum(ALLOWED_TABLES),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ExportParamsSchema.safeParse({
      table: searchParams.get("table"),
    });

    if (!parsed.success) {
      return Response.json(
        { error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}` },
        { status: 400 }
      );
    }

    const { table } = parsed.data;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "No data to export" }, { status: 404 });
    }

    const csv = generateCSV(data as Record<string, unknown>[]);
    const filename = `${table}-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
