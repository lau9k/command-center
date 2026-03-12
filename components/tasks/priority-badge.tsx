"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number;
  factors: string[];
}

function getScoreColor(score: number): string {
  if (score > 80) {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900";
  }
  if (score > 50) {
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900";
  }
  return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900";
}

export function ScoreBadge({ score, factors }: ScoreBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
              getScoreColor(score),
            )}
          >
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="mb-1 font-medium">Priority Score: {score}/100</p>
          {factors.length > 0 && (
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              {factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
