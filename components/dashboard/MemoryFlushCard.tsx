"use client";

import { useState } from "react";
import { ClipboardCopy, Check, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FLUSH_PROMPT = `Flush memory intake to Personize. Run: node memory/flush-intake.mjs --send
Then create new intake files for this session's key decisions, relationship updates, and strategy shifts.`;

export function MemoryFlushCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(FLUSH_PROMPT);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy prompt to clipboard");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-5 text-muted-foreground" />
          <div>
            <CardTitle>Flush Memory Intake</CardTitle>
            <CardDescription>Sync session memories to Personize</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="rounded-md border border-border bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap">
          {FLUSH_PROMPT}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <ClipboardCopy className="size-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardContent>
    </Card>
  );
}
