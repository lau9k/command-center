"use client";

import { useEffect, useState } from "react";
import { Mail, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GmailContextResponse } from "@/app/api/contacts/[id]/gmail/route";

interface ContactInteractionsTabProps {
  contactId: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ContactInteractionsTab({
  contactId,
}: ContactInteractionsTabProps) {
  const [data, setData] = useState<GmailContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchGmail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/contacts/${contactId}/gmail`);
        if (res.status === 422) {
          if (!cancelled) setError("No email address — cannot load interactions");
          return;
        }
        if (res.status === 503) {
          if (!cancelled) setError("Email integration not configured");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch {
        if (!cancelled) setError("Could not load email history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGmail();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
    );
  }

  if (!data || (data.gmail_threads === 0 && data.subjects.length === 0)) {
    return (
      <div className="py-12 text-center">
        <Mail className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          No email interactions found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Threads</p>
          <p className="text-lg font-semibold">{data.gmail_threads}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Messages</p>
          <p className="text-lg font-semibold">{data.gmail_messages}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">First Email</p>
          <p className="text-sm font-medium">{formatDate(data.gmail_earliest)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Latest Email</p>
          <p className="text-sm font-medium">{formatDate(data.gmail_latest)}</p>
        </div>
      </div>

      {/* Direction indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {data.lautaro_sent ? (
          <>
            <ArrowUpRight className="size-4 text-blue-500" />
            You have sent emails to this contact
          </>
        ) : (
          <>
            <ArrowDownLeft className="size-4 text-green-500" />
            Inbound only — you haven&apos;t emailed this contact yet
          </>
        )}
      </div>

      {/* Subject list */}
      {data.subjects.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Subjects
          </p>
          <div className="divide-y divide-border rounded-lg border border-border">
            {data.subjects.map((subject, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{subject}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.gmail_context_stored && (
        <Badge variant="secondary" className="text-xs">
          Gmail context synced
        </Badge>
      )}
    </div>
  );
}
