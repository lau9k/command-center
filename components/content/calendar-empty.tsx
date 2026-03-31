"use client";

import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarEmptyProps {
  viewMode?: "week" | "month";
}

export function CalendarEmpty({ viewMode = "month" }: CalendarEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
        <CalendarPlus className="size-8 text-blue-500 dark:text-blue-400" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">
        No posts scheduled
      </h3>
      <p className="mb-4 max-w-xs text-center text-sm text-muted-foreground">
        Start by creating a post and scheduling it for this{" "}
        {viewMode === "week" ? "week" : "month"}.
      </p>
      <Button
        asChild
        size="sm"
        className="bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
      >
        <Link href="/content/editor">
          <Plus className="mr-1 size-4" />
          Create Post
        </Link>
      </Button>
    </div>
  );
}
