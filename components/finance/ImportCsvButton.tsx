"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TransactionImport } from "./TransactionImport";

export function ImportCsvButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-1.5 size-3.5" />
        Import CSV
      </Button>
      <TransactionImport
        open={open}
        onOpenChange={setOpen}
        onImportComplete={() => router.refresh()}
      />
    </>
  );
}
