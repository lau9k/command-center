import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateCSV as generateRawCSV, generateFilteredCSV, generatePDFHTML } from "@/lib/export";
import { generateCSV as generateFormattedCSV } from "@/lib/csv-export";
import { EXPORT_COLUMNS, MODULE_TABLES, type ExportModule } from "@/components/shared/export-configs";
import { applyFilters, type FilterCondition } from "@/lib/filters";

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

const ALLOWED_MODULES = ["tasks", "contacts", "pipeline", "finance"] as const;

const ExportParamsSchema = z.object({
  table: z.enum(ALLOWED_TABLES),
});

const ModuleExportSchema = z.object({
  module: z.enum(ALLOWED_MODULES),
});

const FilterConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "is_null", "is_not_null",
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
});

const ExportPostSchema = z.object({
  entity_type: z.enum(ALLOWED_TABLES),
  format: z.enum(["csv", "pdf"]),
  columns: z.array(z.string()).min(1),
  date_range: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
});

const ENTITY_LABELS: Record<string, string> = {
  contacts: "Contacts",
  tasks: "Tasks",
  sponsors: "Sponsors",
  content_posts: "Content Posts",
  pipeline_items: "Pipeline Deals",
  transactions: "Transactions",
  debts: "Debts",
  projects: "Projects",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Module-based export (new): /api/export?module=tasks&filters=[...]
    const moduleParam = searchParams.get("module");
    if (moduleParam) {
      return handleModuleExport(moduleParam, searchParams.get("filters"));
    }

    // Legacy table export: /api/export?table=tasks
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

    const csv = generateRawCSV(data as Record<string, unknown>[]);
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

async function handleModuleExport(
  moduleParam: string,
  filtersParam: string | null
) {
  const parsed = ModuleExportSchema.safeParse({ module: moduleParam });
  if (!parsed.success) {
    return Response.json(
      { error: `Invalid module. Allowed: ${ALLOWED_MODULES.join(", ")}` },
      { status: 400 }
    );
  }

  const mod = parsed.data.module as ExportModule;
  const table = MODULE_TABLES[mod];
  const columns = EXPORT_COLUMNS[mod];

  // Parse and validate filters
  let filters: FilterCondition[] = [];
  if (filtersParam) {
    try {
      const raw: unknown = JSON.parse(filtersParam);
      if (Array.isArray(raw)) {
        const result = z.array(FilterConditionSchema).safeParse(raw);
        if (result.success) {
          filters = result.data as FilterCondition[];
        }
      }
    } catch {
      // Ignore invalid filter JSON — export without filters
    }
  }

  const supabase = createServiceClient();
  const selectFields = columns.map((c) => c.key).join(",");

  let query = supabase
    .from(table)
    .select(selectFields)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (filters.length > 0) {
    query = applyFilters(query, filters);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return Response.json({ error: "No data to export" }, { status: 404 });
  }

  const csv = generateFormattedCSV(columns, data as unknown as Record<string, unknown>[]);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${mod}-export-${dateStr}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ExportPostSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { entity_type, format, columns, date_range } = parsed.data;
    const supabase = createServiceClient();

    let query = supabase
      .from(entity_type)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (date_range?.from) {
      query = query.gte("created_at", `${date_range.from}T00:00:00`);
    }
    if (date_range?.to) {
      query = query.lte("created_at", `${date_range.to}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "No data to export" }, { status: 404 });
    }

    const rows = data as Record<string, unknown>[];
    const dateStr = new Date().toISOString().slice(0, 10);
    const label = ENTITY_LABELS[entity_type] ?? entity_type;

    if (format === "pdf") {
      const html = generatePDFHTML(rows, columns, `${label} Export`);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${entity_type}-export-${dateStr}.html"`,
        },
      });
    }

    const csv = generateFilteredCSV(rows, columns);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entity_type}-export-${dateStr}.csv"`,
      },
    });
  } catch {
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
