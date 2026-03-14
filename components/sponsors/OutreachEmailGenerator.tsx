"use client";

import { useState, useMemo } from "react";
import { Send, Mail, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Sponsor, SponsorOutreachStatus } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATES = [
  {
    id: "initial_outreach",
    label: "Initial Outreach",
    subject: "Partnership Opportunity — {{sponsor_name}}",
    body: `Hi {{contact_name}},

I hope this message finds you well. I'm reaching out because I believe there's a great opportunity for {{sponsor_name}} to partner with us on an upcoming initiative.

We'd love to explore how we can work together to create mutual value. Would you be open to a brief call this week to discuss potential sponsorship tiers and benefits?

Looking forward to hearing from you.

Best regards`,
  },
  {
    id: "follow_up",
    label: "Follow Up",
    subject: "Following Up — {{sponsor_name}} Partnership",
    body: `Hi {{contact_name}},

I wanted to follow up on my previous message about a potential partnership with {{sponsor_name}}.

We have several sponsorship tiers available and I'd be happy to walk you through the benefits and audience reach. If you're interested, I can send over a detailed proposal.

Would any time this week work for a quick chat?

Best regards`,
  },
  {
    id: "proposal",
    label: "Sponsorship Proposal",
    subject: "Sponsorship Proposal for {{sponsor_name}}",
    body: `Hi {{contact_name}},

Thank you for your interest in sponsoring our event. I'm excited to share more details about the partnership opportunity with {{sponsor_name}}.

Here's a quick overview of what we're offering:
- Brand visibility across all event channels
- Speaking or demo opportunities
- Direct access to our community of engaged participants

I'd love to schedule a time to discuss which tier best aligns with your goals. Please let me know your availability.

Best regards`,
  },
  {
    id: "confirmation",
    label: "Confirmation & Next Steps",
    subject: "Welcome Aboard — {{sponsor_name}} Sponsorship Confirmed",
    body: `Hi {{contact_name}},

Great news! I'm thrilled to confirm {{sponsor_name}} as an official sponsor. Thank you for your commitment and support.

Here are the next steps:
1. We'll send over the sponsorship agreement for review
2. Please share your brand assets (logo, description, links)
3. We'll schedule a kickoff call to align on deliverables

Please don't hesitate to reach out if you have any questions.

Best regards`,
  },
] as const;

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

interface OutreachEmailGeneratorProps {
  sponsor: Sponsor;
  onStatusChange?: (sponsorId: string, status: SponsorOutreachStatus) => void;
}

export function OutreachEmailGenerator({ sponsor, onStatusChange }: OutreachEmailGeneratorProps) {
  const [templateId, setTemplateId] = useState<string>("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const variables = useMemo<Record<string, string>>(() => ({
    sponsor_name: sponsor.name,
    contact_name: sponsor.contact_name ?? "there",
    contact_email: sponsor.contact_email ?? "",
    tier: sponsor.tier,
    status: sponsor.status,
    amount: Number(sponsor.amount).toLocaleString("en-US", {
      style: "currency",
      currency: sponsor.currency ?? "USD",
    }),
  }), [sponsor]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = TEMPLATES.find((t) => t.id === id);
    if (template) {
      setCustomSubject(template.subject);
      setCustomBody(template.body);
    }
  }

  const previewSubject = useMemo(
    () => interpolate(customSubject, variables),
    [customSubject, variables]
  );

  const previewBody = useMemo(
    () => interpolate(customBody, variables),
    [customBody, variables]
  );

  async function handleMarkStatus(newStatus: SponsorOutreachStatus) {
    try {
      const res = await fetch("/api/sponsors/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsor_id: sponsor.id,
          outreach_status: newStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      onStatusChange?.(sponsor.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function copyToClipboard() {
    const fullEmail = `Subject: ${previewSubject}\n\n${previewBody}`;
    await navigator.clipboard.writeText(fullEmail);
    toast.success("Email copied to clipboard");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Compose Email — {sponsor.name}
          </h3>
        </div>
        {sponsor.contact_email && (
          <p className="text-xs text-muted-foreground">
            To: {sponsor.contact_name ?? sponsor.contact_email}
            {sponsor.contact_name && ` <${sponsor.contact_email}>`}
          </p>
        )}
      </div>

      {/* Template + Subject */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gen-template">Template</Label>
          <Select value={templateId} onValueChange={handleTemplateChange}>
            <SelectTrigger id="gen-template">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gen-subject">Subject</Label>
          <Input
            id="gen-subject"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Email subject..."
          />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="gen-body">Body</Label>
        <Textarea
          id="gen-body"
          value={customBody}
          onChange={(e) => setCustomBody(e.target.value)}
          placeholder="Email body... Use {{variable}} for interpolation"
          rows={8}
          className="resize-y font-mono text-sm"
        />
      </div>

      {/* Preview Toggle */}
      {(customSubject || customBody) && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="size-3.5" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          {showPreview && (
            <div className="mt-2 rounded-md bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Interpolated Preview
              </p>
              <p className="text-sm text-foreground">
                <span className="font-medium">Subject:</span> {previewSubject}
              </p>
              <div className="text-sm text-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {previewBody}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          disabled={!customSubject && !customBody}
        >
          Copy Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleMarkStatus("draft")}
        >
          Mark Draft
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => handleMarkStatus("sent")}
        >
          <Send className="size-3.5" />
          Mark Sent
        </Button>
      </div>
    </div>
  );
}
