"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  ArrowDown,
  MessageSquare,
  Calendar,
} from "lucide-react";

interface GmailContextData {
  gmail_threads: number;
  gmail_messages: number;
  gmail_earliest: string | null;
  gmail_latest: string | null;
  lautaro_sent: boolean;
  subjects: string[];
  gmail_context_stored: boolean;
}

interface GmailTimelineProps {
  contactId: string;
  contactEmail: string | null;
  open: boolean;
}

interface GmailState {
  loading: boolean;
  data: GmailContextData | null;
  error: string | null;
}

function GmailSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function formatDateRange(earliest: string | null, latest: string | null): string {
  if (!earliest && !latest) return "No date range";

  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (earliest && latest) {
    const start = fmt(earliest);
    const end = fmt(latest);
    return start === end ? start : `${start} — ${end}`;
  }

  return earliest ? `Since ${fmt(earliest)}` : `Until ${fmt(latest!)}`;
}

export function GmailTimeline({
  contactId,
  contactEmail,
  open,
}: GmailTimelineProps) {
  const [state, setState] = useState<GmailState>({
    loading: false,
    data: null,
    error: null,
  });

  const fetchGmail = useCallback(async (id: string) => {
    setState({ loading: true, data: null, error: null });

    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(id)}/gmail`);

      if (res.status === 503) {
        setState({ loading: false, data: null, error: "not_configured" });
        return;
      }

      if (res.status === 422) {
        setState({ loading: false, data: null, error: "no_email" });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch Gmail data");
      }

      const json = await res.json();
      setState({ loading: false, data: json.data, error: null });
    } catch {
      setState({
        loading: false,
        data: null,
        error: "Failed to load Gmail data",
      });
    }
  }, []);

  useEffect(() => {
    if (contactId && open) {
      fetchGmail(contactId);
    } else {
      setState({ loading: false, data: null, error: null });
    }
  }, [contactId, open, fetchGmail]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm">Communication</CardTitle>
          </div>
          {!state.loading && contactEmail && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchGmail(contactId)}
              title="Refresh Gmail data"
            >
              <RefreshCw className="size-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {state.loading ? (
          <GmailSkeleton />
        ) : state.error === "not_configured" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" />
            Personize not configured
          </div>
        ) : state.error === "no_email" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" />
            No email — cannot fetch Gmail data
          </div>
        ) : state.error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {state.error}
          </div>
        ) : !state.data?.gmail_context_stored ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No Gmail data synced for this contact
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Thread + Message Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Mail className="size-3" />
                {state.data.gmail_threads} {state.data.gmail_threads === 1 ? "thread" : "threads"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="size-3" />
                {state.data.gmail_messages} {state.data.gmail_messages === 1 ? "message" : "messages"}
              </Badge>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              {formatDateRange(state.data.gmail_earliest, state.data.gmail_latest)}
            </div>

            {/* Direction Indicator */}
            <div className="flex items-center gap-1.5 text-sm">
              {state.data.lautaro_sent ? (
                <>
                  <ArrowUpDown className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-400">Bidirectional</span>
                </>
              ) : (
                <>
                  <ArrowDown className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-400">Inbound only</span>
                </>
              )}
            </div>

            {/* Subjects */}
            {state.data.subjects.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Recent Subjects
                </span>
                <ul className="space-y-1">
                  {state.data.subjects.map((subject, idx) => (
                    <li
                      key={idx}
                      className="truncate rounded-md border border-border px-2 py-1 text-sm text-foreground/90"
                    >
                      {subject}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
