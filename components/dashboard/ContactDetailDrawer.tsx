"use client";

import { useEffect, useState, useCallback } from "react";
import type { Contact } from "@/lib/types/database";
import type { SmartRecallItem } from "@/lib/personize/types";
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
import {
  Brain,
  Loader2,
  AlertCircle,
  Mail,
  Building2,
  Calendar,
  Star,
} from "lucide-react";

interface ContactDetailDrawerProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

interface MemoryState {
  loading: boolean;
  memories: SmartRecallItem[];
  error: string | null;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400",
};

export function ContactDetailDrawer({
  contact,
  open,
  onClose,
}: ContactDetailDrawerProps) {
  const [memory, setMemory] = useState<MemoryState>({
    loading: false,
    memories: [],
    error: null,
  });

  const fetchMemories = useCallback(async (contactId: string) => {
    setMemory({ loading: true, memories: [], error: null });

    try {
      const res = await fetch(`/api/contacts/${contactId}/memory`);

      if (res.status === 503) {
        setMemory({ loading: false, memories: [], error: "not_configured" });
        return;
      }

      if (res.status === 422) {
        setMemory({
          loading: false,
          memories: [],
          error: "no_email",
        });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch memories");
      }

      const json = await res.json();
      const memories = json.data?.memories ?? [];
      setMemory({ loading: false, memories, error: null });
    } catch {
      setMemory({
        loading: false,
        memories: [],
        error: "Failed to load memories",
      });
    }
  }, []);

  useEffect(() => {
    if (contact && open) {
      fetchMemories(contact.id);
    } else {
      setMemory({ loading: false, memories: [], error: null });
    }
  }, [contact, open, fetchMemories]);

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{contact.name}</SheetTitle>
          <SheetDescription>
            {[contact.email, contact.company].filter(Boolean).join(" · ") ||
              "No email or company"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Contact Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email ?? "No email"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company ?? "No company"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last activity:{" "}
                  {contact.last_contact_date
                    ? new Date(contact.last_contact_date).toLocaleDateString()
                    : contact.updated_at
                      ? new Date(contact.updated_at).toLocaleDateString()
                      : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Score: {contact.score ?? 0}</span>
              </div>
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {contact.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={tagColors[tag] ?? ""}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {contact.source}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {contact.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Personize Memory Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  What Personize Remembers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {memory.loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading memories...
                </div>
              ) : memory.error === "not_configured" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Personize not configured
                </div>
              ) : memory.error === "no_email" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No email — cannot fetch memories
                </div>
              ) : memory.error ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {memory.error}
                </div>
              ) : memory.memories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No memories found for this contact
                </p>
              ) : (
                <ul className="space-y-2">
                  {memory.memories.map((item) => (
                    <li
                      key={item.id}
                      className="space-y-1.5 rounded-md border border-border p-3 text-sm"
                    >
                      <p>{item.text}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[item.relevance_tier] ?? tierColors.might}`}
                        >
                          {item.score.toFixed(2)}
                        </span>
                        {item.topic && (
                          <Badge variant="secondary" className="text-xs">
                            {item.topic}
                          </Badge>
                        )}
                        {item.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">
                      Contact created
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {contact.last_contact_date && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">
                        Last contacted
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(contact.last_contact_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">
                      Last updated
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contact.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
