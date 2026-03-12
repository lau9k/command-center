"use client";

import Link from "next/link";
import type { Conversation } from "@/lib/types/database";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Video,
  Linkedin,
  Phone,
  MessageCircle,
  Calendar,
  Users,
  ExternalLink,
  Clock,
} from "lucide-react";

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

const channelMeta: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  email: {
    label: "Email",
    icon: <Mail className="size-3.5" />,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
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

export function ConversationDetailDrawer({
  conversation,
  open,
  onClose,
}: ConversationDetailDrawerProps) {
  if (!conversation) return null;

  const channel = channelMeta[conversation.channel ?? "other"] ?? channelMeta.other;
  const metadata = conversation.metadata ?? {};
  const metadataEntries = Object.entries(metadata).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pr-6">
            {conversation.summary
              ? conversation.summary.split("\n")[0]?.slice(0, 80) ?? "Conversation"
              : "Conversation"}
          </SheetTitle>
          <SheetDescription>
            <Badge variant="outline" className={`gap-1 ${channel.className}`}>
              {channel.icon}
              {channel.label}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Linked Contact */}
          {conversation.contacts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Linked Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{conversation.contacts.name}</span>
                </div>
                {conversation.contacts.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{conversation.contacts.email}</span>
                  </div>
                )}
                {conversation.contacts.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {conversation.contacts.company}
                  </div>
                )}
                <Link href={`/contacts?highlight=${conversation.contacts.id}`}>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                    <ExternalLink className="size-3.5" />
                    View Contact
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last message:</span>
                <span>
                  {conversation.last_message_at
                    ? new Date(conversation.last_message_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(conversation.created_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Full Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
                {conversation.summary ?? "No summary available."}
              </div>
            </CardContent>
          </Card>

          {/* Metadata / Tags */}
          {metadataEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-muted-foreground min-w-[80px]">
                        {key}:
                      </span>
                      <span className="text-foreground break-all">
                        {typeof value === "string" ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
