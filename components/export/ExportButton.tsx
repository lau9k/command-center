"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog, type EntityType } from "@/components/export/ExportDialog";

interface ExportButtonProps {
  table: EntityType;
  label?: string;
}

export function ExportButton({ table, label = "Export" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="size-4" />
        {label}
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} entityType={table} />
    </>
  );
}
