"use client";

import { Repeat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskRecurrenceBadgeProps {
  recurrenceRule: string;
}

function formatRule(rule: string): string {
  switch (rule) {
    case "daily":
      return "Repeats daily";
    case "weekly":
      return "Repeats weekly";
    case "monthly":
      return "Repeats monthly";
    default:
      return `Repeats: ${rule}`;
  }
}

export function TaskRecurrenceBadge({ recurrenceRule }: TaskRecurrenceBadgeProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
            <Repeat className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{formatRule(recurrenceRule)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
