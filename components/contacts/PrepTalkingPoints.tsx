"use client";

import { Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  DossierConversation,
  DossierMeeting,
  DossierTask,
  DossierPipelineItem,
  DossierContact,
} from "@/app/api/contacts/[id]/dossier/route";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

interface TalkingPoint {
  text: string;
  category: "deal" | "task" | "conversation" | "meeting" | "relationship";
}

function generateTalkingPoints(
  contact: DossierContact,
  tasks: DossierTask[],
  pipelineItems: DossierPipelineItem[],
  conversations: DossierConversation[],
  meetings: DossierMeeting[]
): TalkingPoint[] {
  const points: TalkingPoint[] = [];

  // Active deals
  for (const deal of pipelineItems) {
    if (deal.stage) {
      points.push({
        text: `Follow up on "${deal.title}" \u2014 currently in ${deal.stage.name} stage`,
        category: "deal",
      });
    }
  }

  // Open tasks
  const openTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled"
  );
  for (const task of openTasks.slice(0, 3)) {
    const dateStr = task.due_date
      ? `due ${formatDate(task.due_date)}`
      : `assigned ${formatDate(task.created_at)}`;
    points.push({
      text: `Check on "${task.title}" \u2014 ${dateStr}`,
      category: "task",
    });
  }

  // Recent conversations
  if (conversations.length > 0) {
    const latest = conversations[0];
    const subject = latest.summary ?? "conversation";
    const channel = latest.channel ? ` (${latest.channel})` : "";
    const date = formatDate(latest.last_message_at ?? latest.created_at);
    points.push({
      text: `Last ${channel} thread: "${subject}" \u2014 ${date}`,
      category: "conversation",
    });
  }

  // Recent meetings
  if (meetings.length > 0) {
    const latest = meetings[0];
    const date = formatDate(latest.meeting_date);
    points.push({
      text: `Last meeting: "${latest.title}" \u2014 ${date}`,
      category: "meeting",
    });

    // Pending action items from latest meeting
    if (latest.action_items?.length) {
      for (const item of latest.action_items.slice(0, 2)) {
        points.push({
          text: `Follow up on action item: "${item.title}"${item.assignee ? ` (assigned to ${item.assignee})` : ""}`,
          category: "meeting",
        });
      }
    }
  }

  // Relationship health
  const days = daysSince(contact.last_contact_date);
  if (days !== null && days > 30) {
    points.push({
      text: `It\u2019s been ${days} days since last contact \u2014 consider reconnecting`,
      category: "relationship",
    });
  }

  return points;
}

const categoryStyles: Record<
  TalkingPoint["category"],
  { dot: string; bg: string }
> = {
  deal: {
    dot: "bg-green-500",
    bg: "border-green-500/20 bg-green-500/5",
  },
  task: {
    dot: "bg-orange-500",
    bg: "border-orange-500/20 bg-orange-500/5",
  },
  conversation: {
    dot: "bg-blue-500",
    bg: "border-blue-500/20 bg-blue-500/5",
  },
  meeting: {
    dot: "bg-purple-500",
    bg: "border-purple-500/20 bg-purple-500/5",
  },
  relationship: {
    dot: "bg-pink-500",
    bg: "border-pink-500/20 bg-pink-500/5",
  },
};

interface PrepTalkingPointsProps {
  contact: DossierContact;
  tasks: DossierTask[];
  pipelineItems: DossierPipelineItem[];
  conversations: DossierConversation[];
  meetings: DossierMeeting[];
}

export function PrepTalkingPoints({
  contact,
  tasks,
  pipelineItems,
  conversations,
  meetings,
}: PrepTalkingPointsProps) {
  const [copied, setCopied] = useState(false);
  const points = generateTalkingPoints(
    contact,
    tasks,
    pipelineItems,
    conversations,
    meetings
  );

  const handleCopy = async () => {
    const text = points.map((p) => `\u2022 ${p.text}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="size-4 text-yellow-500" />
            Talking Points
          </CardTitle>
          {points.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleCopy}
              title="Copy all talking points"
            >
              {copied ? (
                <Check className="size-3 text-green-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <Lightbulb className="mx-auto mb-2 size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No talking points to generate yet. Interact with this contact to
                build context.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {points.map((point, i) => {
              const style = categoryStyles[point.category];
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2.5 rounded-md border p-2.5 ${style.bg}`}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                  />
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {point.text}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
