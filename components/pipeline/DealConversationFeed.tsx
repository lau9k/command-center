"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  MessageSquare,
  Video,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  type: "email" | "linkedin" | "meeting" | "other";
  subject: string | null;
  preview: string;
  timestamp: string;
  external_url: string | null;
  channel_label: string;
}

interface Props {
  dealId: string;
  contactIds: string[];
}

export function DealConversationFeed({ dealId, contactIds }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["deal-conversations", dealId, contactIds.slice().sort().join(",")],
    queryFn: async (): Promise<{ items: ConversationItem[] }> => {
      const res = await fetch(`/api/pipeline/${dealId}/conversations`);
      if (!res.ok) throw new Error("Failed to load conversation history");
      return res.json();
    },
    staleTime: 30_000,
    enabled: contactIds.length > 0,
  });

  const items = data?.items ?? [];

  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Conversation History
      </h4>
      {contactIds.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          Link a primary contact to see their conversation history.
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load conversation history.</p>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No conversations logged for these contacts yet.
        </p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto rounded-md border border-border bg-card">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <FeedRow key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FeedRow({ item }: { item: ConversationItem }) {
  const [expanded, setExpanded] = useState(false);
  const Icon =
    item.type === "email"
      ? Mail
      : item.type === "linkedin"
      ? MessageSquare
      : item.type === "meeting"
      ? Video
      : MessageSquare;

  const ts = new Date(item.timestamp);
  const tsLabel = !isNaN(ts.getTime())
    ? formatDistanceToNow(ts, { addSuffix: true })
    : "—";
  const tsFull = !isNaN(ts.getTime()) ? format(ts, "PPP p") : item.timestamp;

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {item.subject ?? item.preview.slice(0, 60)}
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {item.channel_label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span title={tsFull}>{tsLabel}</span>
            {!expanded && item.preview && item.subject && (
              <span className="truncate">· {item.preview.slice(0, 80)}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className={cn("border-t border-border bg-background/50 px-3 py-2 text-sm")}>
          <p className="whitespace-pre-wrap text-foreground">{item.preview}</p>
          {item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs text-primary hover:underline"
            >
              Open original →
            </a>
          )}
        </div>
      )}
    </li>
  );
}
