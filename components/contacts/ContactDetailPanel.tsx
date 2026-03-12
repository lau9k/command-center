"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
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
import {
  Mail,
  Building2,
  Star,
  Pencil,
  Trash2,
  Archive,
  Tag,
} from "lucide-react";
import { ContactEnrichmentPanel } from "@/components/contacts/ContactEnrichmentPanel";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { InlineEditField } from "@/components/contacts/InlineEditField";
import {
  ActivityTimeline,
  type ActivityEvent,
} from "@/components/contacts/ActivityTimeline";
import type { Contact } from "@/lib/types/database";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";

interface ContactDetailPanelProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
  onContactUpdated: (updated: Contact) => void;
  onContactDeleted: (id: string) => void;
}

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400",
};

export function ContactDetailPanel({
  contact,
  open,
  onClose,
  onEdit,
  onContactUpdated,
  onContactDeleted,
}: ContactDetailPanelProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [notes, setNotes] = useState<
    { id: string; text: string; timestamp: string }[]
  >([]);

  // Build activity events from contact data + local notes
  const activityEvents: ActivityEvent[] = useMemo(() => {
    if (!contact) return [];

    const events: ActivityEvent[] = [];

    // Contact created
    events.push({
      id: "created",
      type: "created",
      title: "Contact created",
      timestamp: contact.created_at,
    });

    // Last contacted
    if (contact.last_contact_date) {
      events.push({
        id: "last-contact",
        type: "email",
        title: "Last contacted",
        timestamp: contact.last_contact_date,
      });
    }

    // Last updated (if different from created)
    if (contact.updated_at !== contact.created_at) {
      events.push({
        id: "updated",
        type: "updated",
        title: "Contact updated",
        timestamp: contact.updated_at,
      });
    }

    // Notes added in this session
    for (const note of notes) {
      events.push({
        id: note.id,
        type: "note",
        title: "Note added",
        description: note.text,
        timestamp: note.timestamp,
      });
    }

    // Sort chronologically, newest first
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return events;
  }, [contact, notes]);

  const patchContact = useCallback(
    async (field: string, value: string | string[] | number) => {
      if (!contact) return;
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data } = await res.json();
      onContactUpdated(data);
      toast.success("Contact updated");
    },
    [contact, onContactUpdated]
  );

  const handleAddNote = useCallback(
    async (text: string) => {
      if (!contact) return;
      // Save note as a notes field update via PATCH
      const currentNotes = (contact as unknown as Record<string, unknown>).notes as string | null;
      const newNotesText = currentNotes
        ? `${currentNotes}\n\n---\n\n${text}`
        : text;

      await patchContact("notes", newNotesText);

      setNotes((prev) => [
        ...prev,
        { id: `note-${Date.now()}`, text, timestamp: new Date().toISOString() },
      ]);
    },
    [contact, patchContact]
  );

  const handleDelete = useCallback(async () => {
    if (!contact) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Contact deleted");
      setDeleteOpen(false);
      onContactDeleted(contact.id);
      onClose();
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setDeleting(false);
    }
  }, [contact, onContactDeleted, onClose]);

  const handleArchive = useCallback(async () => {
    if (!contact) return;
    setArchiving(true);
    try {
      await patchContact("status", "inactive");
    } catch {
      toast.error("Failed to archive contact");
    } finally {
      setArchiving(false);
    }
  }, [contact, patchContact]);

  if (!contact) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <div className="flex items-center gap-3">
              <ContactAvatar name={contact.name} size="lg" />
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate">{contact.name}</SheetTitle>
                <SheetDescription className="truncate">
                  {[contact.email, contact.company]
                    .filter(Boolean)
                    .join(" · ") || "No email or company"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onEdit(contact)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleArchive}
                disabled={archiving || contact.status === "inactive"}
              >
                <Archive className="size-3.5" />
                {archiving ? "Archiving..." : "Archive"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>

            {/* Contact Info — inline editable */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InlineEditField
                  label="Name"
                  value={contact.name}
                  onSave={(v) => patchContact("name", v)}
                />
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <InlineEditField
                    label="Email"
                    value={contact.email ?? ""}
                    placeholder="Add email"
                    onSave={(v) => patchContact("email", v || null as unknown as string)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <InlineEditField
                    label="Company"
                    value={contact.company ?? ""}
                    placeholder="Add company"
                    onSave={(v) => patchContact("company", v || null as unknown as string)}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="size-3.5 shrink-0 text-muted-foreground" />
                  <InlineEditField
                    label="Score"
                    value={String(contact.score ?? 0)}
                    onSave={(v) => patchContact("score", Number(v) || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Tag className="size-3.5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contact.tags && contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
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
                ) : (
                  <p className="text-sm text-muted-foreground">No tags</p>
                )}
                <div className="mt-2 flex items-center gap-1 text-sm">
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

            {/* Contact Enrichment — Personize recall + digest */}
            <ContactEnrichmentPanel
              contactId={contact.id}
              contactName={contact.name}
              contactEmail={contact.email ?? null}
              open={open}
            />

            <Separator />

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  contact={contact}
                  events={activityEvents}
                  onAddNote={handleAddNote}
                />
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact"
        description={`Are you sure you want to delete "${contact.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
