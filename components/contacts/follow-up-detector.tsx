"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";

interface FollowUpContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  score: number;
  status: string;
  last_contact_date: string | null;
  days_since_contact: number | null;
  urgency_score: number;
  urgency_label: "overdue" | "due-soon" | "upcoming" | "ok";
}

interface FollowUpMeta {
  total: number;
  overdue: number;
  due_soon: number;
  upcoming: number;
}

interface FollowUpDetectorProps {
  onContactClick?: (contactId: string) => void;
}

const urgencyColors: Record<string, string> = {
  overdue: "bg-red-500/15 text-red-700 dark:text-red-400",
  "due-soon": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  upcoming: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

const urgencyIcons: Record<string, typeof AlertCircle> = {
  overdue: AlertCircle,
  "due-soon": AlertTriangle,
  upcoming: Clock,
};

function FollowUpSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-md border border-border p-3"
        >
          <div className="size-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function formatDaysSince(days: number | null): string {
  if (days === null) return "Never contacted";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function FollowUpDetector({ onContactClick }: FollowUpDetectorProps) {
  const [contacts, setContacts] = useState<FollowUpContact[]>([]);
  const [meta, setMeta] = useState<FollowUpMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/follow-ups");
      if (!res.ok) throw new Error("Failed to fetch follow-ups");
      const json = await res.json();
      setContacts(json.data as FollowUpContact[]);
      setMeta(json.meta as FollowUpMeta);
    } catch {
      setError("Failed to load follow-up data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  if (loading) return <FollowUpSkeleton />;

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
        <Button variant="outline" size="sm" onClick={fetchFollowUps}>
          <RefreshCw className="mr-1.5 size-3" />
          Retry
        </Button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <UserCheck className="size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="text-xs text-muted-foreground">
          No contacts need follow-up right now
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      {meta && (
        <div className="flex flex-wrap gap-1.5">
          {meta.overdue > 0 && (
            <Badge className={urgencyColors.overdue}>
              {meta.overdue} overdue
            </Badge>
          )}
          {meta.due_soon > 0 && (
            <Badge className={urgencyColors["due-soon"]}>
              {meta.due_soon} due soon
            </Badge>
          )}
          {meta.upcoming > 0 && (
            <Badge className={urgencyColors.upcoming}>
              {meta.upcoming} upcoming
            </Badge>
          )}
        </div>
      )}

      {/* Contact list */}
      <div className="space-y-1.5">
        {contacts.map((contact) => {
          const UrgencyIcon = urgencyIcons[contact.urgency_label] ?? Clock;
          return (
            <button
              key={contact.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-md border border-border p-2.5 text-left transition-colors hover:bg-muted/50"
              onClick={() => onContactClick?.(contact.id)}
            >
              <ContactAvatar name={contact.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {contact.name}
                  </span>
                  {contact.company && (
                    <span className="truncate text-xs text-muted-foreground">
                      {contact.company}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDaysSince(contact.days_since_contact)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <UrgencyIcon className="size-3.5" />
                <Badge
                  className={`text-[10px] ${urgencyColors[contact.urgency_label] ?? ""}`}
                >
                  {contact.urgency_label === "due-soon"
                    ? "Due Soon"
                    : contact.urgency_label.charAt(0).toUpperCase() +
                      contact.urgency_label.slice(1)}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={fetchFollowUps} className="gap-1.5">
          <RefreshCw className="size-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
