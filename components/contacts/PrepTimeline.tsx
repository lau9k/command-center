"use client";

import {
  MessageSquare,
  Calendar,
  CheckSquare,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DossierConversation,
  DossierMeeting,
  DossierTask,
  DossierPipelineItem,
} from "@/app/api/contacts/[id]/dossier/route";

interface TimelineEvent {
  id: string;
  type: "conversation" | "meeting" | "task" | "pipeline";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string | null | undefined>;
}

function buildTimeline(
  conversations: DossierConversation[],
  meetings: DossierMeeting[],
  tasks: DossierTask[],
  pipelineItems: DossierPipelineItem[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const c of conversations) {
    events.push({
      id: `conv-${c.id}`,
      type: "conversation",
      title: c.summary ?? "Conversation",
      description: c.channel ? `via ${c.channel}` : undefined,
      timestamp: c.last_message_at ?? c.created_at,
    });
  }

  for (const m of meetings) {
    const desc = m.summary
      ? m.summary.length > 120
        ? m.summary.slice(0, 120) + "..."
        : m.summary
      : undefined;
    events.push({
      id: `meet-${m.id}`,
      type: "meeting",
      title: m.title,
      description: desc,
      timestamp: m.meeting_date ?? new Date().toISOString(),
      metadata: {
        decisions: m.decisions?.length
          ? `${m.decisions.length} decisions`
          : undefined,
        actions: m.action_items?.length
          ? `${m.action_items.length} action items`
          : undefined,
      },
    });
  }

  for (const t of tasks) {
    events.push({
      id: `task-${t.id}`,
      type: "task",
      title: t.title,
      description: `${t.priority} priority \u00B7 ${t.status}`,
      timestamp: t.due_date ?? t.created_at,
      metadata: { status: t.status },
    });
  }

  for (const p of pipelineItems) {
    events.push({
      id: `pipe-${p.id}`,
      type: "pipeline",
      title: p.title,
      description: p.stage ? `Stage: ${p.stage.name}` : undefined,
      timestamp: p.updated_at ?? p.created_at,
    });
  }

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return events;
}

const typeConfig: Record<
  TimelineEvent["type"],
  { icon: React.ElementType; color: string; label: string }
> = {
  conversation: {
    icon: MessageSquare,
    color: "bg-blue-500",
    label: "Conversation",
  },
  meeting: { icon: Calendar, color: "bg-purple-500", label: "Meeting" },
  task: { icon: CheckSquare, color: "bg-orange-500", label: "Task" },
  pipeline: { icon: TrendingUp, color: "bg-green-500", label: "Pipeline" },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

interface PrepTimelineProps {
  conversations: DossierConversation[];
  meetings: DossierMeeting[];
  tasks: DossierTask[];
  pipelineItems: DossierPipelineItem[];
}

export function PrepTimeline({
  conversations,
  meetings,
  tasks,
  pipelineItems,
}: PrepTimelineProps) {
  const events = buildTimeline(conversations, meetings, tasks, pipelineItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="size-4 text-muted-foreground" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No interactions found for this contact yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative space-y-0">
            {events.map((event, idx) => {
              const config = typeConfig[event.type];
              const Icon = config.icon;
              const isLast = idx === events.length - 1;

              return (
                <div key={event.id} className="relative flex gap-3 pb-5">
                  {!isLast && (
                    <div className="absolute left-[13px] top-7 h-[calc(100%-14px)] w-px bg-border" />
                  )}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    <Icon className="size-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="mr-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {config.label}
                        </span>
                        <p className="mt-1 text-sm font-medium leading-snug">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                        {event.metadata && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {Object.entries(event.metadata)
                              .filter(([, v]) => v)
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                >
                                  {value}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
