"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  FileText,
  AlertCircle,
  Handshake,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

interface BriefingInteraction {
  text: string;
  date: string | null;
  type: string;
  topic: string;
}

interface BriefingData {
  contact: {
    name: string;
    email: string | null;
    company: string | null;
    role: string | null;
    score: number;
    last_contact_date: string | null;
    days_since_contact: number | null;
  };
  summary: string | null;
  properties: Record<string, string>;
  recent_interactions: BriefingInteraction[];
  commitments: BriefingInteraction[];
  interests: BriefingInteraction[];
  relationship_health: {
    score: number;
    label: "strong" | "healthy" | "needs-attention" | "at-risk";
    factors: string[];
  };
  generated_at: string;
}

interface MeetingBriefingProps {
  contactId: string;
  contactName: string;
}

const healthColors: Record<string, string> = {
  strong: "bg-green-500/15 text-green-700 dark:text-green-400",
  healthy: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "needs-attention": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "at-risk": "bg-red-500/15 text-red-700 dark:text-red-400",
};

const healthLabels: Record<string, string> = {
  strong: "Strong",
  healthy: "Healthy",
  "needs-attention": "Needs Attention",
  "at-risk": "At Risk",
};

function BriefingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse space-y-2 rounded-md border border-border p-4">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-2 rounded-md border border-border p-3"
        >
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function InteractionItem({ interaction }: { interaction: BriefingInteraction }) {
  return (
    <div className="space-y-1 rounded-md border border-border p-2.5 text-sm">
      <p className="leading-relaxed text-foreground/90">{interaction.text}</p>
      <div className="flex items-center gap-1.5">
        {interaction.topic && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {interaction.topic}
          </Badge>
        )}
        {interaction.date && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(interaction.date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export function MeetingBriefing({ contactId, contactName }: MeetingBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/contacts/${encodeURIComponent(contactId)}/briefing`
      );
      if (!res.ok) throw new Error("Failed to generate briefing");
      const json = await res.json();
      setData(json.data as BriefingData);
    } catch {
      setError("Failed to generate briefing. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  if (loading) return <BriefingSkeleton />;

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
        <Button variant="outline" size="sm" onClick={generateBriefing}>
          <RefreshCw className="mr-1.5 size-3" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <FileText className="size-10 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">Meeting Prep</p>
          <p className="text-xs text-muted-foreground">
            Generate an AI-powered briefing for your next meeting with{" "}
            {contactName}
          </p>
        </div>
        <Button onClick={generateBriefing} size="sm" className="gap-1.5">
          <FileText className="size-3.5" />
          Generate Briefing
        </Button>
      </div>
    );
  }

  const health = data.relationship_health;

  return (
    <div className="space-y-3">
      {/* Relationship Health */}
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Relationship Health</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{health.score}</span>
          <Badge className={healthColors[health.label]}>
            {healthLabels[health.label]}
          </Badge>
        </div>
      </div>

      {/* Health Factors */}
      {health.factors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {health.factors.map((factor) => (
            <Badge key={factor} variant="outline" className="text-[10px]">
              {factor}
            </Badge>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {data.summary && (
        <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400">
            <FileText className="size-3" />
            AI Summary
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {data.summary}
          </p>
        </div>
      )}

      {/* Contact Quick Info */}
      {data.contact.days_since_contact !== null && (
        <div className="text-xs text-muted-foreground">
          Last contacted{" "}
          <span className="font-medium text-foreground">
            {data.contact.days_since_contact === 0
              ? "today"
              : data.contact.days_since_contact === 1
                ? "yesterday"
                : `${data.contact.days_since_contact} days ago`}
          </span>
          {data.contact.company && (
            <>
              {" "}
              at{" "}
              <span className="font-medium text-foreground">
                {data.contact.company}
              </span>
            </>
          )}
        </div>
      )}

      {/* Recent Interactions */}
      {data.recent_interactions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="size-3" />
            Recent Interactions ({data.recent_interactions.length})
          </div>
          {data.recent_interactions.map((interaction, i) => (
            <InteractionItem key={i} interaction={interaction} />
          ))}
        </div>
      )}

      {/* Commitments */}
      {data.commitments.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Handshake className="size-3" />
            Commitments ({data.commitments.length})
          </div>
          {data.commitments.map((item, i) => (
            <InteractionItem key={i} interaction={item} />
          ))}
        </div>
      )}

      {/* Interests & Objections */}
      {data.interests.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3" />
            Interests & Concerns ({data.interests.length})
          </div>
          {data.interests.map((item, i) => (
            <InteractionItem key={i} interaction={item} />
          ))}
        </div>
      )}

      {/* No enriched data fallback */}
      {!data.summary &&
        data.recent_interactions.length === 0 &&
        data.commitments.length === 0 &&
        data.interests.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No AI data available. Briefing based on local contact data only.
          </p>
        )}

      {/* Regenerate */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={generateBriefing} className="gap-1.5">
          <RefreshCw className="size-3" />
          Regenerate
        </Button>
      </div>
    </div>
  );
}
