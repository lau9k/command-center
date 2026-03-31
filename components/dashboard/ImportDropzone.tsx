"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  file: File | null;
  onClear: () => void;
  disabled?: boolean;
  rowCount?: number;
  columnCount?: number;
}

export function ImportDropzone({
  onFile,
  file,
  onClear,
  disabled,
  rowCount,
  columnCount,
}: ImportDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) {
        onFile(f);
      } else {
        toast.error("Please upload a CSV file");
      }
    },
    [onFile, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {rowCount ?? 0} rows, {columnCount ?? 0} columns
            </p>
          </div>
        </div>
        {!disabled && (
          <Button variant="ghost" size="icon" onClick={onClear} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <Upload className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">
          Drop your CSV file here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">Supports .csv files</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInput}
      />
    </label>
  );
}
