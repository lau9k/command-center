"use client";

import { useState } from "react";
import { Mail, Phone, Calendar, Linkedin, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SponsorOutreach, OutreachType, OutreachStatus } from "@/lib/types/database";
import { LogOutreachForm } from "./LogOutreachForm";

const TYPE_CONFIG: Record<OutreachType, { label: string; icon: typeof Mail; className: string }> = {
  email: { label: "Email", icon: Mail, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  call: { label: "Call", icon: Phone, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  meeting: { label: "Meeting", icon: Calendar, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  linkedin: { label: "LinkedIn", icon: Linkedin, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  other: { label: "Other", icon: MessageSquare, className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
};

const STATUS_CONFIG: Record<OutreachStatus, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  replied: { label: "Replied", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  no_response: { label: "No Response", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
  follow_up_needed: { label: "Follow Up", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface OutreachTimelineProps {
  sponsorId: string;
  initialOutreach: SponsorOutreach[];
}

export function OutreachTimeline({ sponsorId, initialOutreach }: OutreachTimelineProps) {
  const [outreach, setOutreach] = useState<SponsorOutreach[]>(initialOutreach);
  const [showForm, setShowForm] = useState(false);

  const handleOutreachCreated = (entry: SponsorOutreach) => {
    setOutreach((prev) => [entry, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Outreach Timeline</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Log Outreach
        </Button>
      </div>

      <LogOutreachForm
        sponsorId={sponsorId}
        open={showForm}
        onOpenChange={setShowForm}
        onCreated={handleOutreachCreated}
      />

      {outreach.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No outreach logged yet.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            Log First Outreach
          </Button>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          {outreach.map((entry) => {
            const typeConfig = TYPE_CONFIG[entry.type];
            const statusConfig = STATUS_CONFIG[entry.status];
            const Icon = typeConfig.icon;

            return (
              <div key={entry.id} className="relative flex gap-4 pb-6">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 rounded-lg border border-border bg-card p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeConfig.className}`}>
                      {typeConfig.label}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(entry.contacted_at)}
                    </span>
                  </div>
                  {entry.subject && (
                    <p className="mt-1.5 text-sm font-medium text-foreground">{entry.subject}</p>
                  )}
                  {entry.notes && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{entry.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
