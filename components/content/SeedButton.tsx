"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SeedContentButton() {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const router = useRouter();

  async function handleSeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/content/seed", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Seed failed");
      }

      const data = await res.json();
      setSeeded(true);
      toast.success(
        `Seeded ${data.imported} of ${data.total} content posts`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed content");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSeed}
      disabled={loading || seeded}
      variant="outline"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : seeded ? (
        <CheckCircle2 className="size-4 text-green-500" />
      ) : (
        <Database className="size-4" />
      )}
      {loading ? "Seeding..." : seeded ? "Content Seeded" : "Seed Content"}
    </Button>
  );
}
