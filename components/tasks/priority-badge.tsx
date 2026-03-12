"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ScoringFactor } from "@/lib/task-scoring";

interface ScoreBadgeProps {
  score: number;
  factors: ScoringFactor[];
}

function scoreColor(score: number) {
  if (score > 80) return "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
  if (score > 50) return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
}

export function ScoreBadge({ score, factors }: ScoreBadgeProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums cursor-default",
              scoreColor(score)
            )}
          >
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-56">
          <p className="mb-1 text-xs font-semibold">Score breakdown</p>
          <ul className="space-y-0.5 text-xs">
            {factors.map((f) => (
              <li key={f.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium">
                  {f.score}/{f.maxScore}
                </span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
