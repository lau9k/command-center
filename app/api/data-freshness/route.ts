import { NextResponse } from "next/server";

import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

export interface DataFreshnessResponse {
  contacts: string | null;
  tasks: string | null;
  pipeline_items: string | null;
  content_posts: string | null;
  meetings: string | null;
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const tables = [
    "contacts",
    "tasks",
    "pipeline_items",
    "content_posts",
    "meetings",
  ] as const;

  const results = await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single(),
    ),
  );

  const data: DataFreshnessResponse = {
    contacts: null,
    tasks: null,
    pipeline_items: null,
    content_posts: null,
    meetings: null,
  };

  for (let i = 0; i < tables.length; i++) {
    const result = results[i];
    if (result.data) {
      data[tables[i]] = (result.data as { updated_at: string }).updated_at;
    }
  }

  return NextResponse.json({ data });
}));
