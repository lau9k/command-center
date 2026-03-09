"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MemberSearch({ value, onChange, className }: MemberSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or wallet address..."
        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
      />
    </div>
  );
}
