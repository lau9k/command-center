"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Conversation } from "@/lib/types/database";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Video,
  Linkedin,
  Phone,
  MessageCircle,
  Clock,
  Users,
  ExternalLink,
  Archive,
  ListTodo,
  UserPlus,
  Send,
  Hash,
} from "lucide-react";
import { MessageActions } from "./MessageActions";

interface ConversationWithContact extends Conversation {
  contacts: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
}

interface ConversationDetailDrawerProps {
  conversation: ConversationWithContact | null;
  open: boolean;
  onClose: () => void;
}

const channelMeta: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  email: {
    label: "Email",
    icon: <Mail className="size-3.5" />,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  slack: {
    label: "Slack",
    icon: <Hash className="size-3.5" />,
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  telegram: {
    label: "Telegram",
    icon: <Send className="size-3.5" />,
    className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  meeting: {
    label: "Meeting",
    icon: <Video className="size-3.5" />,
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Linkedin className="size-3.5" />,
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  phone: {
    label: "Phone",
    icon: <Phone className="size-3.5" />,
    className: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  other: {
    label: "Other",
    icon: <MessageCircle className="size-3.5" />,
    className: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  },
};

interface ParsedMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isContact: boolean;
}

function parseMessages(conversation: ConversationWithContact): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // Try to parse messages from metadata
  const metaMessages = conversation.metadata?.messages;
  if (Array.isArray(metaMessages)) {
    for (const msg of metaMessages) {
      if (typeof msg !== "object" || msg === null) continue;
      const m = msg as Record<string, unknown>;

      // Support both field naming conventions:
      //   LinkedIn ingest: { content, from, date, direction }
      //   Generic/manual:  { text, sender, timestamp, is_contact }
      const text = (m.text as string) ?? (m.content as string) ?? null;
      if (typeof text !== "string" || !text) continue;

      const sender =
        (m.sender as string) ?? (m.from as string) ?? "Unknown";
      const timestamp =
        (m.timestamp as string) ??
        (m.date as string) ??
        conversation.created_at;

      let isContact: boolean;
      if (typeof m.is_contact === "boolean") {
        isContact = m.is_contact;
      } else if (typeof m.direction === "string") {
        isContact = (m.direction as string).toUpperCase() === "INBOUND";
      } else {
        isContact = sender !== "Lautaro Cepeda" && sender === conversation.contacts?.name;
      }

      messages.push({
        id: (m.id as string) ?? `msg-${messages.length}`,
        sender,
        text,
        timestamp,
        isContact,
      });
    }
  }

  // Fallback: treat the summary as a single message
  if (messages.length === 0 && conversation.summary) {
    messages.push({
      id: "summary-0",
      sender: conversation.contacts?.name ?? "Contact",
      text: conversation.summary,
      timestamp:
        conversation.last_message_at ?? conversation.created_at,
      isContact: true,
    });
  }

  return messages;
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6 px-4 pb-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function ConversationDetailDrawer({
  conversation,
  open,
  onClose,
}: ConversationDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [fullConversation, setFullConversation] =
    useState<ConversationWithContact | null>(null);
  const [draftReply, setDraftReply] = useState("");

  const fetchThread = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const json = await res.json();
        setFullConversation(json.data);
      }
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && conversation?.id) {
      setDraftReply("");
      fetchThread(conversation.id);
    } else {
      setFullConversation(null);
    }
  }, [open, conversation?.id, fetchThread]);

  const active = fullConversation ?? conversation;
  const channel =
    channelMeta[active?.channel ?? "other"] ?? channelMeta.other;
  const messages = useMemo(
    () => (active ? parseMessages(active) : []),
    [active]
  );

  function handleSaveDraft() {
    if (!draftReply.trim()) return;
    toast.success("Draft saved");
    setDraftReply("");
  }

  function handleArchive() {
    toast.info("Conversation archived");
    onClose();
  }

  function handleAddToContact() {
    toast.info("Contact linking coming soon");
  }

  function handleCreateTask() {
    if (!active || messages.length === 0) return;
    const snippet = messages[messages.length - 1].text;
    const contactName = active.contacts?.name;
    const title = contactName
      ? `Follow up with ${contactName}`
      : "Follow up on conversation";
    const description = `From ${active.channel ?? "conversation"}:\n\n"${snippet.slice(0, 200)}"`;

    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority: "medium",
        status: "todo",
      }),
    })
      .then((r) => {
        if (r.ok) toast.success("Task created");
        else throw new Error("Failed");
      })
      .catch(() => toast.error("Failed to create task"));
  }

  if (!conversation) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pr-6">
            {active?.summary
              ? active.summary.split("\n")[0]?.slice(0, 80) ?? "Conversation"
              : "Conversation"}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`gap-1 ${channel.className}`}>
                {channel.icon}
                {channel.label}
              </Badge>
              {active?.contacts && (
                <span className="text-xs text-muted-foreground">
                  with {active.contacts.name}
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Action Bar */}
        <div className="flex gap-2 border-b px-4 pb-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleCreateTask}
          >
            <ListTodo className="size-3.5" />
            Create Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAddToContact}
          >
            <UserPlus className="size-3.5" />
            Add to Contact
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleArchive}
          >
            <Archive className="size-3.5" />
            Archive
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <DrawerSkeleton />
          ) : (
            <div className="space-y-6 px-4 pb-6">
              {/* Linked Contact */}
              {active?.contacts && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Linked Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {active.contacts.name}
                      </span>
                    </div>
                    {active.contacts.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {active.contacts.email}
                        </span>
                      </div>
                    )}
                    {active.contacts.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {active.contacts.company}
                      </div>
                    )}
                    <Link
                      href={`/contacts?highlight=${active.contacts.id}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1.5"
                      >
                        <ExternalLink className="size-3.5" />
                        View Contact
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Message Thread */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">
                  Thread ({messages.length}{" "}
                  {messages.length === 1 ? "message" : "messages"})
                </h3>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group relative rounded-lg border bg-card p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                            msg.isContact
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {msg.sender.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">
                          {msg.sender}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <MessageActions
                        messageText={msg.text}
                        contactName={active?.contacts?.name}
                        conversationChannel={active?.channel ?? undefined}
                      />
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last message:</span>
                    <span>
                      {active?.last_message_at
                        ? new Date(active.last_message_at).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>
                      {active
                        ? new Date(active.created_at).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              {active?.metadata &&
                Object.entries(active.metadata).filter(
                  ([k, v]) =>
                    k !== "messages" &&
                    v !== null &&
                    v !== undefined &&
                    v !== ""
                ).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(active.metadata)
                          .filter(
                            ([k, v]) =>
                              k !== "messages" &&
                              v !== null &&
                              v !== undefined &&
                              v !== ""
                          )
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="min-w-[80px] font-medium text-muted-foreground">
                                {key}:
                              </span>
                              <span className="break-all text-foreground">
                                {typeof value === "string"
                                  ? value
                                  : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
        </div>

        {/* Compose Box — pinned to bottom */}
        <div className="border-t bg-background px-4 py-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Draft a reply..."
              value={draftReply}
              onChange={(e) => setDraftReply(e.target.value)}
              rows={2}
              className="min-h-[60px] resize-none"
            />
            <Button
              size="sm"
              className="self-end gap-1.5"
              disabled={!draftReply.trim()}
              onClick={handleSaveDraft}
            >
              <Send className="size-3.5" />
              Save Draft
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Drafts are saved locally. Sending is not yet available.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
