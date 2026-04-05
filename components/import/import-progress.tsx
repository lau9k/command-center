"use client";

import { useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImportProgressProps {
  total: number;
  processed: number;
  errors: number;
  status: string;
  batchSize?: number;
}

function formatETA(totalRecords: number, processedRecords: number, startTime: number): string {
  if (processedRecords === 0) return "Calculating...";
  const elapsed = Date.now() - startTime;
  const rate = processedRecords / elapsed;
  const remaining = totalRecords - processedRecords;
  const etaMs = remaining / rate;

  if (etaMs < 1000) return "< 1s";
  if (etaMs < 60_000) return `~${Math.ceil(etaMs / 1000)}s`;
  return `~${Math.ceil(etaMs / 60_000)}m`;
}

export function ImportProgress({
  total,
  processed,
  errors,
  status,
  batchSize = 50,
}: ImportProgressProps) {
  const [startTime] = useState(() => Date.now());

  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const currentBatch = Math.ceil(processed / batchSize) || 1;
  const totalBatches = Math.ceil(total / batchSize);
  const isComplete = status === "complete" || status === "failed";

  const eta = useMemo(() => {
    if (isComplete) return "Done";
    return formatETA(total, processed, startTime);
  }, [total, processed, startTime, isComplete]);

  if (isComplete) {
    const allFailed = status === "failed";
    return (
      <div className="space-y-4 py-4">
        <div className="flex flex-col items-center gap-3">
          {allFailed ? (
            <AlertCircle className="h-10 w-10 text-red-500" />
          ) : errors > 0 ? (
            <AlertCircle className="h-10 w-10 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          )}
          <p className="text-lg font-medium">
            {allFailed
              ? "Personize Send Failed"
              : errors > 0
                ? "Completed with Errors"
                : "All Contacts Sent Successfully"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {processed - errors}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{errors}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Sending to Personize...</p>
        <p className="text-sm text-muted-foreground">
          {processed} of {total} contacts processed
          {errors > 0 && ` (${errors} errors)`}
        </p>
      </div>

      <Progress value={percent} className="w-full" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Batch {currentBatch} of {totalBatches} ({batchSize}/batch)
        </span>
        <span>{percent}%</span>
        <span>ETA: {eta}</span>
      </div>
    </div>
  );
}
