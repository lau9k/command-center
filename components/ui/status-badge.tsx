"use client";

import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/design-tokens";

export type ContentStatus = "draft" | "scheduled" | "published" | "failed";

const statusLabels: Record<ContentStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

interface ContentStatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

export function ContentStatusBadge({
  status,
  className,
}: ContentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
        statusBadgeClass[status],
        className
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          backgroundColor: "currentColor",
        }}
      />
      {statusLabels[status]}
    </span>
  );
}
