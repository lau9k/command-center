"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import type { Sponsor, SponsorOutreachStatus } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyMessageButton } from "@/components/copy-message-button";

interface OutreachTaskRowProps {
  sponsor: Sponsor;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onStatusChange: (sponsorId: string, status: SponsorOutreachStatus) => void;
  tierClassName: string;
  statusClassName: string;
  outreachStatusClassName: string;
  formatStatus: (status: string) => string;
}

export function OutreachTaskRow({
  sponsor,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onStatusChange,
  tierClassName,
  statusClassName,
  outreachStatusClassName,
  formatStatus,
}: OutreachTaskRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleMarkSent() {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/sponsors/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsor_id: sponsor.id,
          outreach_status: "sent" as SponsorOutreachStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      onStatusChange(sponsor.id, "sent");
      toast.success(`${sponsor.name} marked as sent`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  const message = sponsor.notes;

  return (
    <>
      <tr
        className={`border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer ${
          isExpanded ? "bg-muted/40" : ""
        }`}
        onClick={onToggleExpand}
      >
        <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${sponsor.name}`}
          />
        </td>
        <td className="px-3 py-3 font-medium text-foreground">
          <span className="inline-flex items-center gap-1.5">
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            {sponsor.name}
          </span>
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {sponsor.contact_name ?? "\u2014"}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {sponsor.contact_email ?? "\u2014"}
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tierClassName}`}
          >
            {sponsor.tier}
          </span>
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClassName}`}
          >
            {formatStatus(sponsor.status)}
          </span>
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${outreachStatusClassName}`}
          >
            {formatStatus(sponsor.outreach_status ?? "draft")}
          </span>
        </td>
        <td className="w-10 px-3 py-3" />
      </tr>

      {isExpanded && (
        <tr className="border-b border-border/50">
          <td colSpan={8} className="px-3 py-0">
            <div className="py-4 pl-8 space-y-4">
              {/* Contact Info Bar */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {sponsor.contact_name && (
                  <span className="font-medium text-foreground">
                    {sponsor.contact_name}
                  </span>
                )}
                {sponsor.contact_name && sponsor.name && (
                  <span className="text-border">|</span>
                )}
                <span>{sponsor.name}</span>
                {sponsor.company_url && (
                  <>
                    <span className="text-border">|</span>
                    <a
                      href={sponsor.company_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      LinkedIn
                    </a>
                  </>
                )}
              </div>

              {/* Message Card */}
              {message ? (
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/30 border border-dashed border-border p-4">
                  <p className="text-sm text-muted-foreground italic">
                    No message template — add one in the sponsor notes field.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                {message && <CopyMessageButton text={message} />}
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={isUpdating || sponsor.outreach_status === "sent"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkSent();
                  }}
                >
                  <Send className="size-3.5" />
                  {isUpdating ? "Updating..." : "Mark as Sent"}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
