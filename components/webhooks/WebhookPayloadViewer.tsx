"use client";

import { useState, useMemo } from "react";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WebhookPayloadViewerProps {
  data: Record<string, unknown> | string | null;
  label?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

function CollapsibleNode({
  keyName,
  value,
  depth,
}: {
  keyName: string;
  value: unknown;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        <span className="text-blue-600 dark:text-blue-400 shrink-0">
          &quot;{keyName}&quot;
        </span>
        <span className="text-muted-foreground">:</span>{" "}
        <span
          className={cn(
            typeof value === "string"
              ? "text-green-600 dark:text-green-400"
              : typeof value === "number"
                ? "text-orange-600 dark:text-orange-400"
                : typeof value === "boolean"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-muted-foreground"
          )}
        >
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="text-blue-600 dark:text-blue-400">
          &quot;{keyName}&quot;
        </span>
        <span className="text-muted-foreground">:</span>
        {!expanded && (
          <span className="text-muted-foreground text-xs ml-1">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        )}
      </button>
      {expanded &&
        entries.map(([k, v]) => (
          <CollapsibleNode key={k} keyName={k} value={v} depth={depth + 1} />
        ))}
    </div>
  );
}

export function WebhookPayloadViewer({
  data,
  label,
  defaultExpanded = true,
  maxHeight = "max-h-96",
}: WebhookPayloadViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showTree, setShowTree] = useState(defaultExpanded);

  const parsed = useMemo(() => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return data;
  }, [data]);

  const formatted = useMemo(() => {
    if (!data) return "";
    if (typeof data === "string") {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  }, [data]);

  if (!data) {
    return (
      <span className="text-xs text-muted-foreground italic">No payload</span>
    );
  }

  function handleCopy() {
    void navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </h4>
          <div className="flex items-center gap-1">
            {parsed && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowTree(!showTree)}
                title={showTree ? "Show raw" : "Show tree"}
              >
                {showTree ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      {!label && (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {showTree && parsed ? (
        <div
          className={cn(
            "rounded-md border bg-muted/50 p-3 text-xs font-mono overflow-x-auto overflow-y-auto",
            maxHeight
          )}
        >
          {Object.entries(parsed).map(([k, v]) => (
            <CollapsibleNode key={k} keyName={k} value={v} depth={0} />
          ))}
        </div>
      ) : (
        <pre
          className={cn(
            "rounded-md border bg-muted/50 p-3 text-xs font-mono overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all",
            maxHeight
          )}
        >
          {formatted}
        </pre>
      )}
    </div>
  );
}
