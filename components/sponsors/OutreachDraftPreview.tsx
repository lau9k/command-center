"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface OutreachDraft {
  sponsorId: string;
  sponsorName: string;
  contactName: string | null;
  contactEmail: string | null;
  subject: string;
  body: string;
}

interface OutreachDraftPreviewProps {
  drafts: OutreachDraft[];
}

function DraftCard({ draft }: { draft: OutreachDraft }) {
  const [copiedField, setCopiedField] = useState<"subject" | "body" | "all" | null>(null);

  async function copyToClipboard(text: string, field: "subject" | "body" | "all") {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field === "all" ? "Full email" : field.charAt(0).toUpperCase() + field.slice(1)} copied`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;

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
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => copyToClipboard(fullEmail, "all")}
        >
          {copiedField === "all" ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy All
        </Button>
      </div>

      {/* Subject */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Subject
          </span>
          <button
            onClick={() => copyToClipboard(draft.subject, "subject")}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy subject"
          >
            {copiedField === "subject" ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
        <p className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2">
          {draft.subject}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Body
          </span>
          <button
            onClick={() => copyToClipboard(draft.body, "body")}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy body"
          >
            {copiedField === "body" ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
        <div className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {draft.body}
        </div>
      </div>
    </div>
  );
}

export function OutreachDraftPreview({ drafts }: OutreachDraftPreviewProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Generated Drafts ({drafts.length})
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((draft) => (
          <DraftCard key={draft.sponsorId} draft={draft} />
        ))}
      </div>
    </div>
  );
}
