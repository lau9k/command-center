"use client";

import {
  CheckSquare,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  DossierConversation,
  DossierTask,
  DossierPipelineItem,
} from "@/app/api/contacts/[id]/dossier/route";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  low: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
};

interface PrepOpenItemsProps {
  tasks: DossierTask[];
  pipelineItems: DossierPipelineItem[];
  conversations: DossierConversation[];
}

export function PrepOpenItems({
  tasks,
  pipelineItems,
  conversations,
}: PrepOpenItemsProps) {
  const openTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled"
  );
  const activeDeals = pipelineItems.filter((p) => p.stage !== null);
  const recentConversations = conversations.slice(0, 3);

  const hasItems =
    openTasks.length > 0 ||
    activeDeals.length > 0 ||
    recentConversations.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-muted-foreground" />
          Open Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-2 size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No open items for this contact.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Open Tasks */}
            {openTasks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                  <CheckSquare className="size-3" />
                  Open Tasks ({openTasks.length})
                </div>
                <div className="space-y-2">
                  {openTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`h-4 border px-1.5 text-[10px] ${priorityColor[task.priority] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                      {task.due_date && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Due {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Deals */}
            {activeDeals.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                  <TrendingUp className="size-3" />
                  Active Deals ({activeDeals.length})
                </div>
                <div className="space-y-2">
                  {activeDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {deal.title}
                        </p>
                        {deal.stage && (
                          <Badge
                            variant="outline"
                            className="mt-1 h-4 px-1.5 text-[10px]"
                          >
                            {deal.stage.name}
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(deal.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Conversations */}
            {recentConversations.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <MessageSquare className="size-3" />
                  Recent Conversations ({conversations.length})
                </div>
                <div className="space-y-2">
                  {recentConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-foreground/90">
                          {conv.summary ?? "Untitled conversation"}
                        </p>
                        {conv.channel && (
                          <span className="mt-0.5 text-xs text-muted-foreground">
                            via {conv.channel}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(conv.last_message_at ?? conv.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
