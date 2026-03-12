"use client";

import { useState } from "react";
import { Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OutreachDraft } from "@/components/sponsors/OutreachDraftPreview";

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

interface BulkOutreachFormProps {
  selectedSponsorIds: string[];
  onDraftsGenerated: (drafts: OutreachDraft[]) => void;
}

export function BulkOutreachForm({
  selectedSponsorIds,
  onDraftsGenerated,
}: BulkOutreachFormProps) {
  const [templateId, setTemplateId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId);

  async function handleGenerate() {
    if (!templateId || selectedSponsorIds.length === 0) return;

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/sponsors/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsor_ids: selectedSponsorIds,
          template_id: template.id,
          subject_template: template.subject,
          body_template: template.body,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate drafts");
      }

      const { data } = await res.json();
      onDraftsGenerated(data);
      toast.success(`Generated ${data.length} draft${data.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate drafts");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Generate Email Drafts
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Template Selector */}
        <div className="space-y-2">
          <Label htmlFor="template">Email Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="template">
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

        {/* Selection Info + Generate */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {selectedSponsorIds.length === 0
                ? "Select sponsors from the table below"
                : `${selectedSponsorIds.length} sponsor${selectedSponsorIds.length === 1 ? "" : "s"} selected`}
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={
              isGenerating || !templateId || selectedSponsorIds.length === 0
            }
            className="gap-1.5"
          >
            <Send className="size-4" />
            {isGenerating ? "Generating..." : "Generate Drafts"}
          </Button>
        </div>
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="rounded-md bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Template Preview
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">Subject:</span>{" "}
            {selectedTemplate.subject}
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {selectedTemplate.body}
          </p>
        </div>
      )}
    </div>
  );
}
