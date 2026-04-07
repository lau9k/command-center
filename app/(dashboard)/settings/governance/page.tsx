"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GovernanceEditor,
  type GovernanceVariable,
  type GovernanceFormData,
  type GovernanceCategory,
} from "@/components/settings/governance-editor";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

// ── Pre-seed templates ───────────────────────────────────

interface GovernanceTemplate {
  name: string;
  category: GovernanceCategory;
  content: string;
  triggerKeywords: string[];
}

const TEMPLATES: GovernanceTemplate[] = [
  {
    name: "Brand Voice",
    category: "brand_voice",
    content: `## Tone & Style
- Professional yet approachable
- Use active voice and clear language
- Avoid jargon unless speaking to technical audiences
- Lead with value, not features

## Writing Principles
- Be concise: say more with fewer words
- Be specific: use concrete examples over abstract claims
- Be human: write like you're talking to a smart colleague

## Do's
- Use "we" for the company, "you" for the customer
- Start with the benefit, then explain how
- Include social proof when possible

## Don'ts
- Never use aggressive sales language
- Avoid superlatives without evidence
- Don't start sentences with "I think" or "I believe"`,
    triggerKeywords: [
      "brand",
      "voice",
      "tone",
      "writing",
      "style",
      "messaging",
    ],
  },
  {
    name: "ICP Definition",
    category: "icp_definition",
    content: `## Ideal Customer Profile

### Company Characteristics
- Industry: SaaS, Technology, Professional Services
- Company size: 50-500 employees
- Revenue: $5M-$100M ARR
- Growth stage: Series A to Series C

### Buyer Persona
- Title: VP of Marketing, Head of Growth, CMO
- Reporting to: CEO or CRO
- Key pain points: scaling personalization, maintaining brand consistency across channels
- Budget authority: $50K-$200K annually for tools

### Qualification Criteria
- Currently using 2+ outreach tools
- Team of 5+ in marketing or sales
- Active content strategy across multiple channels
- Pain around inconsistent messaging or low reply rates

### Disqualification Signals
- Company under 20 employees
- No existing outreach process
- Budget under $10K/year for tools`,
    triggerKeywords: [
      "ICP",
      "ideal customer",
      "target",
      "qualification",
      "prospect",
      "buyer",
    ],
  },
  {
    name: "Outreach Playbook",
    category: "outreach_playbook",
    content: `## Outreach Sequence

### First Touch (Day 0)
- Channel: Email or LinkedIn
- Goal: Establish relevance and curiosity
- Length: Under 100 words
- Must include: personalized observation, clear value prop, soft CTA

### Follow-up 1 (Day 3)
- Channel: Same as first touch
- Goal: Add value with a resource
- Include: case study, relevant article, or data point

### Follow-up 2 (Day 7)
- Channel: Alternate channel
- Goal: Social proof and urgency
- Include: customer result or testimonial

### Break-up (Day 14)
- Channel: Email
- Goal: Final attempt with direct ask
- Tone: Respectful, no guilt

## Rules
- Never send more than 4 touches per sequence
- Always wait minimum 3 days between touches
- Personalize at least 2 sentences per message
- Reference their specific company or role`,
    triggerKeywords: [
      "outreach",
      "sequence",
      "email",
      "follow-up",
      "cold",
      "prospecting",
    ],
  },
  {
    name: "Competitor Policy",
    category: "competitor_policy",
    content: `## Competitive Positioning Rules

### General Principles
- Never disparage competitors by name
- Focus on our unique strengths, not their weaknesses
- Acknowledge competitors exist — denying it reduces credibility

### When Asked About Competitors
- Lead with what makes us different
- Use "unlike traditional approaches" instead of naming competitors
- Provide factual differentiators, not opinions

### Approved Differentiators
- AI-powered personalization at scale
- Unified governance across all channels
- Real-time context from relationship memory
- Compliance-first architecture

### Prohibited Actions
- Never share competitor pricing in writing
- Never screenshot competitor products in sales materials
- Never make unverified performance claims vs competitors
- Never use competitor brand names in ads or SEO`,
    triggerKeywords: [
      "competitor",
      "competitive",
      "differentiation",
      "positioning",
      "versus",
      "vs",
    ],
  },
];

// ── Category display helpers ─────────────────────────────

const CATEGORY_LABELS: Record<GovernanceCategory, string> = {
  brand_voice: "Brand Voice",
  icp_definition: "ICP Definition",
  outreach_playbook: "Outreach Playbook",
  competitor_policy: "Competitor Policy",
  custom: "Custom",
};

const CATEGORY_COLORS: Record<GovernanceCategory, string> = {
  brand_voice: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  icp_definition: "bg-green-500/10 text-green-700 dark:text-green-400",
  outreach_playbook: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  competitor_policy: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  custom: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

// ── Page component ───────────────────────────────────────

export default function GovernancePage() {
  const [variables, setVariables] = useState<GovernanceVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] =
    useState<GovernanceVariable | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchVariables = useCallback(async () => {
    try {
      const res = await fetch("/api/personize/governance", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setVariables(json.data ?? []);
    } catch (error) {
      console.error("[Governance] fetch failed:", error);
      toast.error("Failed to load governance variables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const handleSave = useCallback(
    async (data: GovernanceFormData) => {
      const res = await fetch("/api/personize/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }

      toast.success(
        editingVariable
          ? "Governance variable updated"
          : "Governance variable created"
      );
      await fetchVariables();
    },
    [editingVariable, fetchVariables]
  );

  const handleDelete = useCallback(
    async (variable: GovernanceVariable) => {
      setDeletingId(variable.id);
      try {
        const res = await fetch("/api/personize/governance", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: variable.id }),
        });

        if (!res.ok) throw new Error("Failed to delete");
        toast.success("Governance variable deleted");
        await fetchVariables();
      } catch (error) {
        console.error("[Governance] delete failed:", error);
        toast.error("Failed to delete governance variable");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchVariables]
  );

  const handleEdit = useCallback((variable: GovernanceVariable) => {
    setEditingVariable(variable);
    setEditorOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingVariable(null);
    setEditorOpen(true);
  }, []);

  const handleUseTemplate = useCallback(
    (template: GovernanceTemplate) => {
      setEditingVariable({
        id: "",
        name: template.name,
        content: template.content,
        triggerKeywords: template.triggerKeywords,
        category: template.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setEditorOpen(true);
    },
    []
  );

  // Check which templates are already in use
  const usedCategories = new Set(variables.map((v) => v.category));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Governance
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Define governance variables that guide Personize AI outputs via
              smartGuidelines
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Variable
          </Button>
        </div>
      </div>

      {/* Variables List */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Active Variables
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : variables.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No governance variables yet. Create one or use a template below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {variables.map((variable) => (
              <div
                key={variable.id}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {variable.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={
                        CATEGORY_COLORS[
                          variable.category as GovernanceCategory
                        ] ?? CATEGORY_COLORS.custom
                      }
                    >
                      {CATEGORY_LABELS[
                        variable.category as GovernanceCategory
                      ] ?? variable.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {variable.content.slice(0, 200)}
                    {variable.content.length > 200 ? "..." : ""}
                  </p>
                  {variable.triggerKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variable.triggerKeywords.slice(0, 5).map((kw) => (
                        <Badge
                          key={kw}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {kw}
                        </Badge>
                      ))}
                      {variable.triggerKeywords.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{variable.triggerKeywords.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(variable)}
                    aria-label={`Edit ${variable.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(variable)}
                    disabled={deletingId === variable.id}
                    aria-label={`Delete ${variable.name}`}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === variable.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Templates
            </h2>
            <p className="text-sm text-muted-foreground">
              Pre-built governance templates to get started quickly
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((template) => {
            const inUse = usedCategories.has(template.category);

            return (
              <div
                key={template.category}
                className="rounded-md border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {template.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={CATEGORY_COLORS[template.category]}
                    >
                      {CATEGORY_LABELS[template.category]}
                    </Badge>
                  </div>
                  {inUse && (
                    <span className="text-xs text-muted-foreground">
                      In use
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.content.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() ??
                    template.content.slice(0, 100)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="w-full"
                >
                  {inUse ? "Create Another" : "Use Template"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Modal */}
      <GovernanceEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        variable={editingVariable}
        onSave={handleSave}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

