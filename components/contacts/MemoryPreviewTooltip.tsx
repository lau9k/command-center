"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MemoryPreviewData {
  snippet: string | null;
  score?: number | null;
  cached?: boolean;
}

async function fetchMemoryPreview(
  contactId: string
): Promise<MemoryPreviewData> {
  const res = await fetch(`/api/contacts/${contactId}/memory-preview`);
  if (!res.ok) return { snippet: null };
  return res.json();
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : score >= 0.5
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {pct}%
    </span>
  );
}

interface MemoryPreviewTooltipProps {
  contactId: string;
  children: React.ReactNode;
}

export function MemoryPreviewTooltip({
  contactId,
  children,
}: MemoryPreviewTooltipProps) {
  const [enabled, setEnabled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MemoryPreviewData>({
    queryKey: ["memory-preview", contactId],
    queryFn: () => fetchMemoryPreview(contactId),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const handleMouseEnter = useCallback(() => {
    debounceRef.current = setTimeout(() => {
      // Prefetch into cache so it's ready when tooltip opens
      queryClient.prefetchQuery({
        queryKey: ["memory-preview", contactId],
        queryFn: () => fetchMemoryPreview(contactId),
        staleTime: 10 * 60 * 1000,
      });
      setEnabled(true);
    }, 300);
  }, [contactId, queryClient]);

  const handleMouseLeave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const tooltipContent = (() => {
    if (isLoading && !data) {
      return (
        <span className="text-muted-foreground italic">Loading…</span>
      );
    }
    if (!data?.snippet) {
      return (
        <span className="text-muted-foreground italic">No memories yet</span>
      );
    }
    return (
      <div className="flex flex-col gap-1 max-w-[280px]">
        <p className="text-xs leading-relaxed">{data.snippet}</p>
        {data.score != null && (
          <div className="flex justify-end">
            <ScoreBadge score={data.score} />
          </div>
        )}
      </div>
    );
  })();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger
          asChild
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span>{children}</span>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
