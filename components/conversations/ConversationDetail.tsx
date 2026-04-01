"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Conversation } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
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
import { MessageThread } from "./MessageThread";
import type { ParsedMessage } from "./MessageThread";

interface ConversationWithContact extends Conversation {
  contacts: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
}

interface ConversationDetailProps {
  conversation: ConversationWithContact;
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

function parseMessages(conversation: ConversationWithContact): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  const metaMessages = conversation.metadata?.messages;
  if (Array.isArray(metaMessages)) {
    for (const msg of metaMessages) {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "text" in msg &&
        typeof (msg as Record<string, unknown>).text === "string"
      ) {
        const m = msg as Record<string, unknown>;
        messages.push({
          id: (m.id as string) ?? `msg-${messages.length}`,
          sender: (m.sender as string) ?? (m.from as string) ?? "Unknown",
          text: m.text as string,
          timestamp:
            (m.timestamp as string) ??
            (m.date as string) ??
            conversation.created_at,
          isContact:
            (m.is_contact as boolean) ??
            (m.sender ?? m.from) === conversation.contacts?.name,
        });
      }
    }
  }

  if (messages.length === 0 && conversation.summary) {
    messages.push({
      id: "summary-0",
      sender: conversation.contacts?.name ?? "Contact",
      text: conversation.summary,
      timestamp: conversation.last_message_at ?? conversation.created_at,
      isContact: true,
    });
  }

  return messages;
}

export function ConversationDetail({ conversation }: ConversationDetailProps) {
  const [draftReply, setDraftReply] = useState("");

  const channel =
    channelMeta[conversation.channel ?? "other"] ?? channelMeta.other;
  const messages = useMemo(
    () => parseMessages(conversation),
    [conversation],
  );

  function handleSaveDraft() {
    if (!draftReply.trim()) return;
    toast.success("Draft saved");
    setDraftReply("");
  }

  function handleArchive() {
    toast.info("Conversation archived");
  }

  function handleAddToContact() {
    toast.info("Contact linking coming soon");
  }

  function handleCreateTask() {
    if (messages.length === 0) return;
    const snippet = messages[messages.length - 1].text;
    const contactName = conversation.contacts?.name;
    const title = contactName
      ? `Follow up with ${contactName}`
      : "Follow up on conversation";
    const description = `From ${conversation.channel ?? "conversation"}:\n\n"${snippet.slice(0, 200)}"`;

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/conversations">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back to Conversations
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              {conversation.summary
                ? conversation.summary.split("\n")[0]?.slice(0, 80) ?? "Conversation"
                : "Conversation"}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`gap-1 ${channel.className}`}>
                {channel.icon}
                {channel.label}
              </Badge>
              {conversation.contacts && (
                <span className="text-sm text-muted-foreground">
                  with {conversation.contacts.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2">
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
      </div>

      <Separator className="my-6" />

      {/* Main Content: Sidebar + Thread */}
      <div className="grid flex-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Linked Contact */}
          {conversation.contacts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Linked Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {conversation.contacts.name}
                  </span>
                </div>
                {conversation.contacts.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {conversation.contacts.email}
                    </span>
                  </div>
                )}
                {conversation.contacts.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {conversation.contacts.company}
                  </div>
                )}
                <Link href={`/contacts?highlight=${conversation.contacts.id}`}>
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

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last message:</span>
                <span className="text-foreground">
                  {conversation.last_message_at
                    ? new Date(conversation.last_message_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">
                  {new Date(conversation.created_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {conversation.metadata &&
            Object.entries(conversation.metadata).filter(
              ([k, v]) =>
                k !== "messages" &&
                v !== null &&
                v !== undefined &&
                v !== "",
            ).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(conversation.metadata)
                      .filter(
                        ([k, v]) =>
                          k !== "messages" &&
                          v !== null &&
                          v !== undefined &&
                          v !== "",
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
        </aside>

        {/* Message Thread */}
        <div className="flex flex-col">
          <div className="flex-1">
            <MessageThread
              messages={messages}
              contactName={conversation.contacts?.name}
              conversationChannel={conversation.channel ?? undefined}
            />
          </div>

          {/* Compose Box */}
          <div className="mt-6 rounded-lg border bg-background p-4">
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
        </div>
      </div>
    </div>
  );
}
