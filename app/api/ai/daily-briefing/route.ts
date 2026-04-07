import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export interface DailyBriefing {
  meetings: { id: string; title: string; meetingDate: string | null }[];
  tasksDueSoon: { id: string; title: string; dueDate: string; priority: string }[];
  overdueTasks: { id: string; title: string; dueDate: string; priority: string }[];
  newContacts: { id: string; name: string; company: string | null }[];
  overdueInvoices: { id: string; title: string; amount: number }[];
  summary: string;
  generatedAt: string;
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [meetingsRes, dueSoonRes, overdueRes, newContactsRes, invoicesRes] =
    await Promise.all([
      supabase
        .from("meetings")
        .select("id, title, meeting_date")
        .gte("meeting_date", todayStart)
        .lte("meeting_date", tomorrowEnd)
        .order("meeting_date", { ascending: true })
        .limit(10),
      supabase
        .from("tasks")
        .select("id, title, due_date, priority")
        .neq("status", "done")
        .gte("due_date", todayStart)
        .lte("due_date", in48h)
        .order("due_date", { ascending: true })
        .limit(10),
      supabase
        .from("tasks")
        .select("id, title, due_date, priority")
        .neq("status", "done")
        .lt("due_date", todayStart)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("contacts")
        .select("id, name, company")
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices")
        .select("id, title, amount")
        .eq("status", "overdue")
        .limit(5),
    ]);

  const meetings = (meetingsRes.data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    meetingDate: m.meeting_date as string | null,
  }));

  const tasksDueSoon = (dueSoonRes.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    dueDate: t.due_date as string,
    priority: t.priority as string,
  }));

  const overdueTasks = (overdueRes.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    dueDate: t.due_date as string,
    priority: t.priority as string,
  }));

  const newContacts = (newContactsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    company: c.company as string | null,
  }));

  const overdueInvoices = (invoicesRes.data ?? []).map((i) => ({
    id: i.id as string,
    title: i.title as string,
    amount: Number(i.amount),
  }));

  // Build summary line
  const parts: string[] = [];
  if (meetings.length > 0) parts.push(`${meetings.length} meeting${meetings.length > 1 ? "s" : ""} today`);
  if (tasksDueSoon.length > 0) parts.push(`${tasksDueSoon.length} task${tasksDueSoon.length > 1 ? "s" : ""} due soon`);
  if (overdueTasks.length > 0) parts.push(`${overdueTasks.length} overdue`);
  if (newContacts.length > 0) parts.push(`${newContacts.length} new contact${newContacts.length > 1 ? "s" : ""}`);
  if (overdueInvoices.length > 0) parts.push(`${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`);

  const summary = parts.length > 0 ? parts.join(" · ") : "All clear — nothing urgent today";

  const briefing: DailyBriefing = {
    meetings,
    tasksDueSoon,
    overdueTasks,
    newContacts,
    overdueInvoices,
    summary,
    generatedAt: now.toISOString(),
  };

  return NextResponse.json({ data: briefing });
}));
