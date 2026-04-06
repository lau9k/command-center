"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SmartRecallRecord } from "@/lib/personize/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, X, ChevronDown, ChevronUp } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";

interface PreCallBriefBannerProps {
  contactEmail: string;
  contactName: string;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

function deriveTier(score: number): string {
  if (score >= 0.8) return "direct";
  if (score >= 0.5) return "partial";
  return "might";
}

function BannerSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-2">
          <div className="h-5 w-12 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function PreCallBriefBanner({
  contactEmail,
  contactName,
}: PreCallBriefBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { data: records, isLoading } = useQuery<SmartRecallRecord[]>({
    queryKey: ["pre-call-brief", contactEmail],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: "key topics pain points recent discussion",
        email: contactEmail,
        response_detail: "summary",
      });
      const res = await fetch(`/api/personize/recall?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      const rawRecords = json.data?.records;
      return Array.isArray(rawRecords) ? rawRecords.slice(0, 3) : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!contactEmail,
  });

  if (dismissed) return null;
  if (!isLoading && (!records || records.length === 0)) return null;

  return (
    <Card className="border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            <Brain className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            <CardTitle className="text-sm">
              Context Brief for {contactName}
            </CardTitle>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDismissed(true)}
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-3">
          {isLoading ? (
            <BannerSkeleton />
          ) : (
            <ul className="space-y-2">
              {records?.map((record) => {
                const tier = deriveTier(record.score);
                return (
                  <li
                    key={record.recordId}
                    className="rounded-md border border-border bg-background p-2.5 text-sm space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[tier]}`}
                      >
                        {record.score.toFixed(2)}
                      </span>
                      <span className="font-medium">
                        {record.displayName}
                      </span>
                    </div>
                    {record.memories.length > 0 && (
                      <ul className="list-disc pl-4 text-xs text-muted-foreground">
                        {record.memories.map((mem, idx) => (
                          <li key={idx}>{sanitizeText(mem)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}
