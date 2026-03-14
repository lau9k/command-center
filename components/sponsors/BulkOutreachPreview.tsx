"use client";

import { useState } from "react";
import { Check, Copy, Mail, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OutreachDraft } from "@/components/sponsors/OutreachDraftPreview";
import type { SponsorOutreachStatus } from "@/lib/types/database";

interface BulkOutreachPreviewProps {
  drafts: OutreachDraft[];
  onStatusChange?: (sponsorId: string, status: SponsorOutreachStatus) => void;
}

function BulkDraftCard({
  draft,
  onStatusChange,
}: {
  draft: OutreachDraft;
  onStatusChange?: (sponsorId: string, status: SponsorOutreachStatus) => void;
}) {
  const [copiedField, setCopiedField] = useState<"all" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [markedStatus, setMarkedStatus] = useState<SponsorOutreachStatus | null>(null);

  async function copyToClipboard() {
    const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopiedField("all");
    toast.success(`Email for ${draft.sponsorName} copied`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleMarkStatus(status: SponsorOutreachStatus) {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/sponsors/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsor_id: draft.sponsorId,
          outreach_status: status,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      setMarkedStatus(status);
      onStatusChange?.(draft.sponsorId, status);
      toast.success(`${draft.sponsorName} marked as ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {draft.sponsorName}
          </h3>
          {draft.contactName && (
            <p className="text-xs text-muted-foreground">
              To: {draft.contactName}
              {draft.contactEmail && ` <${draft.contactEmail}>`}
            </p>
          )}
          {!draft.contactName && draft.contactEmail && (
            <p className="text-xs text-muted-foreground">
              To: {draft.contactEmail}
            </p>
          )}
        </div>
        {markedStatus && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="size-3" />
            {markedStatus}
          </span>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Subject
        </span>
        <p className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2">
          {draft.subject}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Body
        </span>
        <div className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap max-h-[160px] overflow-y-auto">
          {draft.body}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={copyToClipboard}
        >
          {copiedField === "all" ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating || markedStatus === "draft"}
          onClick={() => handleMarkStatus("draft")}
        >
          Draft
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={isUpdating || markedStatus === "sent"}
          onClick={() => handleMarkStatus("sent")}
        >
          <Send className="size-3.5" />
          Sent
        </Button>
      </div>
    </div>
  );
}

export function BulkOutreachPreview({ drafts, onStatusChange }: BulkOutreachPreviewProps) {
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  if (drafts.length === 0) return null;

  async function handleMarkAllReady() {
    setIsMarkingAll(true);
    let successCount = 0;

    for (const draft of drafts) {
      try {
        const res = await fetch("/api/sponsors/outreach", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sponsor_id: draft.sponsorId,
            outreach_status: "draft" as SponsorOutreachStatus,
          }),
        });

        if (res.ok) {
          successCount++;
          onStatusChange?.(draft.sponsorId, "draft");
        }
      } catch {
        // continue with remaining
      }
    }

    toast.success(`${successCount} of ${drafts.length} sponsors marked as draft`);
    setIsMarkingAll(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Bulk Preview ({drafts.length} emails)
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={isMarkingAll}
          onClick={handleMarkAllReady}
        >
          <CheckCircle className="size-3.5" />
          {isMarkingAll ? "Updating..." : "Mark All Ready to Send"}
        </Button>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-4 pr-1">
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
            <BulkDraftCard
              key={draft.sponsorId}
              draft={draft}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
