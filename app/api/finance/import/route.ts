import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  transport: ["UBER", "LYFT", "PRESTO", "TTC", "PARKING", "GAS", "SHELL", "PETRO", "ESSO"],
  subscriptions: ["NETFLIX", "SPOTIFY", "DISNEY", "APPLE.COM", "GOOGLE", "AMAZON PRIME", "YOUTUBE"],
  groceries: ["LOBLAWS", "METRO", "WALMART", "COSTCO", "SOBEYS", "FRESHCO", "NO FRILLS", "FARM BOY"],
  dining: ["RESTAURANT", "MCDONALD", "STARBUCKS", "TIM HORTON", "SKIP THE DISHES", "DOORDASH", "UBEREATS"],
  utilities: ["HYDRO", "ENBRIDGE", "ROGERS", "BELL", "TELUS", "FIDO", "KOODO"],
  housing: ["RENT", "MORTGAGE", "CONDO FEE"],
  income: ["PAYROLL", "INTERAC E-TRANSFER", "INTERAC", "DEPOSIT", "SALARY", "DIRECT DEP"],
  health: ["PHARMACY", "SHOPPERS DRUG", "REXALL", "DENTAL", "MEDICAL"],
  entertainment: ["CINEPLEX", "STEAM", "PLAYSTATION", "XBOX", "NINTENDO"],
  shopping: ["AMAZON", "BEST BUY", "CANADIAN TIRE", "IKEA", "HOME DEPOT"],
};

function categorize(description: string): string | null {
  const upper = description.toUpperCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) {
      return category;
    }
  }
  return null;
}

const importRowSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === "string" ? parseFloat(val.replace(/[,$]/g, "")) : val;
    if (isNaN(num)) throw new Error("Invalid amount");
    return num;
  }),
  type: z.enum(["expense", "income"]).optional(),
});

const importRequestSchema = z.object({
  rows: z.array(importRowSchema).min(1, "At least one row is required"),
});

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { rows } = parsed.data;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch existing transactions for duplicate detection
  const { data: existing } = await supabase
    .from("transactions")
    .select("name, amount, start_date");

  const existingSet = new Set(
    (existing ?? []).map(
      (t: { name: string; amount: number; start_date: string | null }) =>
        `${t.name}|${t.amount}|${t.start_date}`
    )
  );

  const toInsert: Array<{
    name: string;
    amount: number;
    type: "expense" | "income";
    category: string | null;
    interval: "one_time";
    start_date: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Parse date - handle common formats
      const dateStr = parseDate(row.date);
      if (!dateStr) {
        errors.push(`Row ${i + 1}: Invalid date "${row.date}"`);
        continue;
      }

      const amount = Math.abs(row.amount);
      const type = row.type ?? (row.amount < 0 ? "expense" : "income");
      const category = categorize(row.description);

      // Duplicate check
      const key = `${row.description}|${amount}|${dateStr}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      existingSet.add(key);

      toInsert.push({
        name: row.description,
        amount,
        type,
        category,
        interval: "one_time" as const,
        start_date: dateStr,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Batch insert
  if (toInsert.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("transactions").insert(batch);
      if (error) {
        errors.push(`Batch insert error: ${error.message}`);
      } else {
        imported += batch.length;
      }
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}));

function parseDate(input: string): string | null {
  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try DD/MM/YYYY (common in Canadian bank statements)
  // We'll parse with Date as fallback
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}
