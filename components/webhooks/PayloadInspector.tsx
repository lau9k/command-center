"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PayloadInspectorProps {
  payload: string | null;
}

export function PayloadInspector({ payload }: PayloadInspectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!payload) {
    return (
      <span className="text-xs text-muted-foreground italic">No payload</span>
    );
  }

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    formatted = payload;
  }

  function handleCopy() {
    void navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {expanded ? "Hide payload" : "View payload"}
      </button>

      {expanded && (
        <div className="mt-2 relative">
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1.5 right-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <pre className="rounded-md border bg-muted/50 p-3 pr-8 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
}
