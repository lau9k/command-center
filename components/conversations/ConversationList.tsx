"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
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
} from "lucide-react";
import type { Conversation } from "@/lib/types/database";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationDetailDrawer } from "./ConversationDetailDrawer";

interface ConversationWithContact extends Conversation {
  contacts: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
}

const CHANNEL_OPTIONS = ["email", "meeting", "linkedin", "phone", "other"] as const;

const channelConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  email: {
    label: "Email",
    icon: <Mail className="size-3" />,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
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

interface ConversationListProps {
  initialConversations: ConversationWithContact[];
  kpis: {
    total: number;
    thisWeek: number;
    uniqueContacts: number;
    channels: number;
  };
}

export function ConversationList({ initialConversations, kpis }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithContact[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (channelFilter && channelFilter !== "all") {
      result = result.filter((c) => c.channel === channelFilter);
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

  const fetchConversations = useCallback(async (source?: string, searchTerm?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (source && source !== "all") params.set("source", source);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/conversations?${params}`);
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data ?? []);
      }
    } catch {
      toast.error("Failed to fetch conversations");
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length >= 3) {
        searchTimeoutRef.current = setTimeout(() => {
          setIsSearching(true);
          fetchConversations(channelFilter, value).finally(() => setIsSearching(false));
        }, 500);
      } else if (!value.trim()) {
        fetchConversations(channelFilter);
      }
    },
    [fetchConversations, channelFilter]
  );

  const handleChannelFilterChange = useCallback(
    (value: string) => {
      setChannelFilter(value);
      fetchConversations(value, search);
    },
    [fetchConversations, search]
  );

  if (conversations.length === 0 && initialConversations.length === 0) {
    return (
      <SharedEmptyState
        icon={<MessageSquare className="size-12" />}
        title="No conversations yet"
        description="Conversations will appear here as they are ingested from emails, meetings, and messages linked to your contacts."
      />
    );
  }

  return (
    <>
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total Conversations"
          value={kpis.total}
          subtitle="all time"
          icon={<MessageSquare className="size-5" />}
        />
        <KpiCard
          label="This Week"
          value={kpis.thisWeek}
          subtitle="recent activity"
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
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations by subject or contact..."
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
        <Select value={channelFilter} onValueChange={handleChannelFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {CHANNEL_OPTIONS.map((ch) => (
              <SelectItem key={ch} value={ch}>
                {channelConfig[ch]?.label ?? ch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
