"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["all", "success", "failed", "pending"] as const;
const EVENT_TYPES = ["all", "invoice.paid", "payment.received", "subscription.created", "push", "pull_request", "message"] as const;

export type StatusFilter = (typeof STATUS_OPTIONS)[number];
export type EventTypeFilter = string;

interface WebhookEventFiltersProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  eventType: EventTypeFilter;
  onEventTypeChange: (eventType: EventTypeFilter) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  onClearFilters: () => void;
}

export function WebhookEventFilters({
  status,
  onStatusChange,
  eventType,
  onEventTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearFilters,
}: WebhookEventFiltersProps) {
  const hasActiveFilters =
    status !== "all" || eventType !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Status filter */}
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(s)}
            className={cn(
              "capitalize",
              status !== s && s === "success" && "hover:border-green-500/30 hover:text-green-500",
              status !== s && s === "failed" && "hover:border-red-500/30 hover:text-red-500",
              status !== s && s === "pending" && "hover:border-yellow-500/30 hover:text-yellow-500"
            )}
          >
            {s}
          </Button>
        ))}

        <span className="mx-2 h-4 w-px bg-border" />

        {/* Event type filter */}
        <select
          value={eventType}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All events</option>
          {EVENT_TYPES.filter((t) => t !== "all").map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">From</label>
        <input
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />
        <label className="text-xs text-muted-foreground">To</label>
        <input
          type="datetime-local"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
