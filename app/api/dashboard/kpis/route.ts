import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export interface DashboardKPIResponse {
  activeDeals: { count: number; totalValue: number };
  openTasks: number;
  contacts: number;
  contentScheduled: number;
  pipelineSummary: Array<{
    project_id: string;
    stage: string;
    item_count: number;
    total_value: number;
  }>;
  finance: {
    income: number;
    expenses: number;
    net: number;
  };
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const [
    activeDealsRes,
    openTasksRes,
    contactsRes,
    contentScheduledRes,
    pipelineSummaryRes,
    financeRes,
  ] = await Promise.all([
    // Active Deals: count + sum where stage != 'closed-lost'
    supabase
      .from("pipeline_items")
      .select("value")
      .neq("stage", "closed-lost"),

    // Open Tasks: count where status != 'done'
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done"),

    // Contacts: total count
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true }),

    // Content Scheduled: count where status = 'scheduled'
    supabase
      .from("content_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),

    // Revenue Pipeline: pipeline_summary materialized view
    supabase
      .from("pipeline_summary")
      .select("project_id, stage, item_count, total_value"),

    // Finance: wallet_pnl_monthly for current month totals
    supabase
      .from("wallet_pnl_monthly")
      .select("income, expenses, net")
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Compute active deals aggregate
  const activeDealsData = activeDealsRes.data ?? [];
  const activeDealsCount = activeDealsData.length;
  const activeDealsValue = activeDealsData.reduce(
    (sum, item) => sum + Number(item.value ?? 0),
    0
  );

  const finance = financeRes.data ?? { income: 0, expenses: 0, net: 0 };

  const response: DashboardKPIResponse = {
    activeDeals: {
      count: activeDealsCount,
      totalValue: activeDealsValue,
    },
    openTasks: openTasksRes.count ?? 0,
    contacts: contactsRes.count ?? 0,
    contentScheduled: contentScheduledRes.count ?? 0,
    pipelineSummary: (pipelineSummaryRes.data ?? []) as DashboardKPIResponse["pipelineSummary"],
    finance: {
      income: Number(finance.income ?? 0),
      expenses: Number(finance.expenses ?? 0),
      net: Number(finance.net ?? 0),
    },
  };

  return NextResponse.json({ data: response });
}));
