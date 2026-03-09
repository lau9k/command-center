"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function SeedDemoButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    contacts: number;
    tasks: number;
    content: number;
    pipeline: number;
  } | null>(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/seed", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Seed failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success(
        `Seeded ${data.contacts} contacts, ${data.tasks} tasks, ${data.content} content posts, ${data.pipeline} pipeline items`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleSeed} disabled={loading} variant="outline" className="gap-2">
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : result ? (
          <CheckCircle2 className="size-4 text-green-500" />
        ) : (
          <Database className="size-4" />
        )}
        {loading ? "Seeding..." : result ? "Seeded" : "Seed Demo Data"}
      </Button>

      {result && (
        <div className="grid grid-cols-4 gap-3 rounded-lg border border-border p-3 text-center text-sm">
          <div>
            <p className="text-lg font-bold text-foreground">{result.contacts}</p>
            <p className="text-xs text-muted-foreground">Contacts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{result.tasks}</p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{result.content}</p>
            <p className="text-xs text-muted-foreground">Content</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{result.pipeline}</p>
            <p className="text-xs text-muted-foreground">Pipeline</p>
          </div>
        </div>
      )}
    </div>
  );
}
