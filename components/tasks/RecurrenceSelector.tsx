"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type RecurrenceRule = "daily" | "weekly" | "monthly" | null;

interface RecurrenceSelectorProps {
  value: RecurrenceRule;
  onChange: (value: RecurrenceRule) => void;
  disabled?: boolean;
}

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceRule }[] = [
  { label: "None", value: null },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export function RecurrenceSelector({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? "None";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "gap-1.5 text-xs",
            value && "text-primary border-primary/50"
          )}
        >
          <Repeat className="size-3.5" />
          {selectedLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {RECURRENCE_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent",
              value === option.value && "bg-accent font-medium"
            )}
          >
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
