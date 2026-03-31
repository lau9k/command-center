"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Search,
  Mail,
  Video,
  Linkedin,
  Phone,
  MessageCircle,
  Calendar,
  Users,
  Clock,
  Hash,
  Send,
} from "lucide-react";
import type { Conversation } from "@/lib/types/database";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { ConversationDetailDrawer } from "./ConversationDetailDrawer";

interface ConversationWithContact extends Conversation {
  contacts: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
}

const CHANNEL_TABS = [
  { value: "all", label: "All" },
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Other" },
] as const;

const channelConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  email: {
    label: "Email",
    icon: <Mail className="size-3" />,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  slack: {
    label: "Slack",
    icon: <Hash className="size-3" />,
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  telegram: {
    label: "Telegram",
    icon: <Send className="size-3" />,
    className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  meeting: {
    label: "Meeting",
    icon: <Video className="size-3" />,
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Linkedin className="size-3" />,
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  phone: {
    label: "Phone",
    icon: <Phone className="size-3" />,
    className: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  other: {
    label: "Other",
    icon: <MessageCircle className="size-3" />,
    className: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  },
};

async function fetchConversations(): Promise<ConversationWithContact[]> {
  const res = await fetch("/api/conversations?limit=50");
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

async function fetchChannelCounts(): Promise<Record<string, number>> {
  const res = await fetch("/api/conversations?limit=50");
  if (!res.ok) return { all: 0 };
  const json = await res.json();
  return json.channel_counts ?? { all: 0 };
}

export function ConversationList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: conversations = [] } = useQuery<ConversationWithContact[]>({
    queryKey: ["conversations", "list"],
    queryFn: fetchConversations,
  });

  const { data: channelCounts = { all: 0 } } = useQuery<Record<string, number>>({
    queryKey: ["conversations", "channel_counts"],
    queryFn: fetchChannelCounts,
  });

  const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [channelFilter, setChannelFilter] = useState<string>(searchParams.get("channel") ?? "all");
  const [isSearching, setIsSearching] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState<"week" | "all">("week");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute KPIs from cached data
  const kpis = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeek = conversations.filter((c) => {
      const date = c.last_message_at ?? c.created_at;
      return new Date(date) >= oneWeekAgo;
    }).length;

    const uniqueContacts = new Set(
      conversations.filter((c) => c.contact_id).map((c) => c.contact_id)
    ).size;

    const channels = new Set(
      conversations.filter((c) => c.channel).map((c) => c.channel)
    ).size;

    return { total: conversations.length, thisWeek, uniqueContacts, channels };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (channelFilter && channelFilter !== "all") {
      if (channelFilter === "other") {
        const primaryChannels = new Set(["email", "slack", "telegram"]);
        result = result.filter((c) => !primaryChannels.has(c.channel ?? "other"));
      } else {
        result = result.filter((c) => c.channel === channelFilter);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.summary && c.summary.toLowerCase().includes(q)) ||
          (c.channel && c.channel.toLowerCase().includes(q)) ||
          (c.contacts?.name && c.contacts.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [conversations, channelFilter, search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length >= 3) {
        searchTimeoutRef.current = setTimeout(() => {
          setIsSearching(true);
          // Search is done client-side from cached data, resolve immediately
          setIsSearching(false);
        }, 300);
      }
    },
    []
  );

  const handleChannelFilterChange = useCallback(
    (value: string) => {
      setChannelFilter(value);
      const params = new URLSearchParams();
      if (value && value !== "all") params.set("channel", value);
      if (search.trim()) params.set("q", search.trim());
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/conversations", { scroll: false });
    },
    [search, router]
  );

  if (conversations.length === 0) {
    return (
      <SharedEmptyState
        icon={<MessageSquare className="size-12" />}
        title="No conversations yet"
        description="Conversations will appear here as they are ingested from emails, meetings, and messages linked to your contacts."
      />
    );
  }

  const isWeek = kpiPeriod === "week";

  return (
    <>
      {/* KPI Strip */}
      <section className="space-y-3">
        <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-0.5 w-fit">
          <button
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              isWeek
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setKpiPeriod("week")}
          >
            This week
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              !isWeek
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setKpiPeriod("all")}
          >
            All time
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Total Conversations"
            value={isWeek ? kpis.thisWeek : kpis.total}
            subtitle={isWeek ? "this week" : "all time"}
            icon={<MessageSquare className="size-5" />}
          />
          <KpiCard
            label={isWeek ? "This Week" : "All Conversations"}
            value={isWeek ? kpis.thisWeek : kpis.total}
            subtitle={isWeek ? "recent activity" : "total"}
            icon={<Clock className="size-5" />}
          />
          <KpiCard
            label="Unique Contacts"
            value={kpis.uniqueContacts}
            subtitle="linked contacts"
            icon={<Users className="size-5" />}
          />
          <KpiCard
            label="Channels"
            value={kpis.channels}
            subtitle="active sources"
            icon={<Calendar className="size-5" />}
          />
        </div>
      </section>

      {/* Channel Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1">
        {CHANNEL_TABS.map((tab) => {
          const isActive = channelFilter === tab.value;
          const count = channelCounts[tab.value] ?? 0;
          return (
            <Button
              key={tab.value}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 whitespace-nowrap ${
                isActive ? "" : "text-muted-foreground"
              }`}
              onClick={() => handleChannelFilterChange(tab.value)}
            >
              {tab.label}
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className="ml-0.5 px-1.5 text-xs"
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by contact name, subject, or content..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Searching...
          </span>
        )}
      </div>

      {/* Conversation Cards */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-8 py-12 text-center">
          <Search className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No conversations match your filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => {
            const config = channelConfig[conversation.channel ?? "other"] ?? channelConfig.other;
            const snippet = conversation.summary
              ? conversation.summary.length > 120
                ? conversation.summary.slice(0, 120) + "..."
                : conversation.summary
              : "No summary available";

            return (
              <Card
                key={conversation.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSelectedConversation(conversation)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {conversation.summary
                          ? conversation.summary.split("\n")[0]?.slice(0, 80) ?? "Conversation"
                          : "Conversation"}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`shrink-0 gap-1 text-xs ${config.className}`}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {snippet}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {conversation.contacts && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {conversation.contacts.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {conversation.last_message_at
                          ? new Date(conversation.last_message_at).toLocaleDateString()
                          : new Date(conversation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <ConversationDetailDrawer
        conversation={selectedConversation}
        open={selectedConversation !== null}
        onClose={() => setSelectedConversation(null)}
      />
    </>
  );
}
