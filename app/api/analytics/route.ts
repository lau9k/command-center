import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  // Sponsors by tier
  let sponsorsByTier: { tier: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("sponsors").select("tier");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.tier] = (counts[row.tier] || 0) + 1;
      }
      sponsorsByTier = Object.entries(counts).map(([tier, count]) => ({
        tier,
        count,
      }));
    }
  } catch {
    sponsorsByTier = [];
  }

  // Sponsors by status
  let sponsorsByStatus: { status: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("sponsors").select("status");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      sponsorsByStatus = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
    }
  } catch {
    sponsorsByStatus = [];
  }

  // Content by platform
  let contentByPlatform: { platform: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("content_posts").select("platform");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const platform = row.platform || "unknown";
        counts[platform] = (counts[platform] || 0) + 1;
      }
      contentByPlatform = Object.entries(counts).map(([platform, count]) => ({
        platform,
        count,
      }));
    }
  } catch {
    contentByPlatform = [];
  }

  // Tasks by status
  let tasksByStatus: { status: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("tasks").select("status");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      tasksByStatus = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
    }
  } catch {
    tasksByStatus = [];
  }

  // Tasks by project
  let tasksByProject: { project: string; count: number }[] = [];
  try {
    const { data } = await supabase
      .from("tasks")
      .select("project_id, projects(name)");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const project =
          (row.projects as unknown as { name: string })?.name ||
          "Unassigned";
        counts[project] = (counts[project] || 0) + 1;
      }
      tasksByProject = Object.entries(counts).map(([project, count]) => ({
        project,
        count,
      }));
    }
  } catch {
    tasksByProject = [];
  }

  return NextResponse.json({
    sponsorsByTier,
    sponsorsByStatus,
    contentByPlatform,
    tasksByStatus,
    tasksByProject,
  });
});
