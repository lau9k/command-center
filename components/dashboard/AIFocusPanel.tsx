"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function AIFocusPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 text-left"
      >
        {collapsed ? (
          <ChevronRight className="size-4 text-[#A855F7]" />
        ) : (
          <ChevronDown className="size-4 text-[#A855F7]" />
        )}
        <h2 className="text-lg font-semibold text-foreground">AI Suggestions</h2>
      </button>
      {!collapsed && (
        <div className="mt-3">
          <EmptyState
            icon={<Sparkles />}
            title="Connect Personize to see AI-prioritized tasks"
            description="AI suggestions will appear here once your Personize integration is active."
            className="border-[#A855F7]/20"
          />
        </div>
      )}
    </section>
  );
}
