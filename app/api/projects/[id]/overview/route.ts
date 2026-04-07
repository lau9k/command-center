import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});

interface KPIs {
  tasks: number;
  conversations: number;
  content: number;
  pipeline: number;
}

interface PipelineByStage {
  stage: string;
  count: number;
}

export const GET = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    const { id } = await context!.params;
    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const projectId = parsed.data.id;
    const supabase = createServiceClient();

    try {
      const [
        { count: taskCount },
        { count: conversationCount },
        { count: contentCount },
        { count: pipelineCount },
        { data: recentTasks },
        { data: recentConversations },
        { data: recentContent },
        { data: pipelineItems },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("content_posts")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("pipeline_items")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee, created_at, updated_at")
          .eq("project_id", projectId)
          .order("priority_score", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("conversations")
          .select("id, summary, channel, last_message_at, contact_id, created_at")
          .eq("project_id", projectId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(3),
        supabase
          .from("content_posts")
          .select("id, title, platform, status, scheduled_at, published_at, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("pipeline_items")
          .select("id, stage_id, pipeline_stages(name)")
          .eq("project_id", projectId),
      ]);

      const kpis: KPIs = {
        tasks: taskCount ?? 0,
        conversations: conversationCount ?? 0,
        content: contentCount ?? 0,
        pipeline: pipelineCount ?? 0,
      };

      // Aggregate pipeline items by stage name
      const stageCounts = new Map<string, number>();
      if (pipelineItems) {
        for (const item of pipelineItems) {
          const stageName =
            (item.pipeline_stages as unknown as { name: string } | null)?.name ??
            "Unknown";
          stageCounts.set(stageName, (stageCounts.get(stageName) ?? 0) + 1);
        }
      }
      const pipelineByStage: PipelineByStage[] = Array.from(
        stageCounts.entries()
      ).map(([stage, count]) => ({ stage, count }));

      return NextResponse.json({
        kpis,
        recentTasks: recentTasks ?? [],
        recentConversations: recentConversations ?? [],
        recentContent: recentContent ?? [],
        pipelineByStage,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch project overview" },
        { status: 500 }
      );
    }
  })
);
