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
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#3B82F6]/10">
        <CalendarPlus className="size-8 text-[#3B82F6]" />
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
        className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
      >
        <Link href="/content/editor">
          <Plus className="mr-1 size-4" />
          Create Post
        </Link>
      </Button>
    </div>
  );
}
