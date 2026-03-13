"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitMerge,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Mail,
  Building2,
  User,
  X,
} from "lucide-react";
import { MergeContactDialog } from "@/components/contacts/MergeContactDialog";

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  source: string;
  status: string;
  tags: string[];
  score: number;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

interface DuplicatePair {
  contactA: ContactData;
  contactB: ContactData;
  confidence: number;
  reason: string;
}

export function DedupClient() {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergePair, setMergePair] = useState<DuplicatePair | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/dedup");
      if (!res.ok) throw new Error("Failed to fetch duplicates");
      const json = await res.json();
      setPairs(json.pairs ?? []);
    } catch {
      toast.error("Failed to load duplicates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleMerged = useCallback(() => {
    setMergePair(null);
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleDismiss = useCallback(async (pair: DuplicatePair) => {
    const pairKey = `${pair.contactA.id}:${pair.contactB.id}`;
    setDismissing(pairKey);
    try {
      const res = await fetch("/api/contacts/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactAId: pair.contactA.id,
          contactBId: pair.contactB.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      setPairs((prev) =>
        prev.filter(
          (p) => !(p.contactA.id === pair.contactA.id && p.contactB.id === pair.contactB.id)
        )
      );
      toast.success("Pair dismissed");
    } catch {
      toast.error("Failed to dismiss pair");
    } finally {
      setDismissing(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Scanning for duplicates...
        </span>
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <CheckCircle2 className="size-12 text-green-500" />
        <div className="text-center">
          <h3 className="text-lg font-medium">No duplicates found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your contacts database looks clean.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDuplicates} className="gap-1.5">
          <RefreshCw className="size-4" />
          Scan Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found <span className="font-medium text-foreground">{pairs.length}</span> potential
          duplicate {pairs.length === 1 ? "pair" : "pairs"}
        </p>
        <Button variant="outline" size="sm" onClick={fetchDuplicates} className="gap-1.5">
          <RefreshCw className="size-4" />
          Rescan
        </Button>
      </div>

      <div className="space-y-4">
        {pairs.map((pair, idx) => (
          <Card key={`${pair.contactA.id}-${pair.contactB.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Side-by-side contacts */}
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <ContactSummary contact={pair.contactA} label="A" />
                  <ContactSummary contact={pair.contactB} label="B" />
                </div>

                {/* Actions column */}
                <div className="flex flex-col items-end gap-2">
                  <ConfidenceBadge confidence={pair.confidence} />
                  <span className="text-xs text-muted-foreground">
                    {pair.reason}
                  </span>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setMergePair(pair)}
                  >
                    <GitMerge className="size-3.5" />
                    Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => handleDismiss(pair)}
                    disabled={dismissing === `${pair.contactA.id}:${pair.contactB.id}`}
                  >
                    {dismissing === `${pair.contactA.id}:${pair.contactB.id}` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                    Not Duplicate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Merge Dialog */}
      {mergePair && (
        <MergeContactDialog
          open={!!mergePair}
          onOpenChange={(open) => !open && setMergePair(null)}
          contactA={mergePair.contactA}
          contactB={mergePair.contactB}
          onMerged={handleMerged}
        />
      )}
    </>
  );
}

function ContactSummary({
  contact,
  label,
}: {
  contact: ContactData;
  label: string;
}) {
  return (
    <div className="space-y-1.5 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5">
          {label}
        </Badge>
        <span className="font-medium text-sm truncate">{contact.name}</span>
      </div>
      {contact.email && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="size-3" />
          <span className="truncate">{contact.email}</span>
        </div>
      )}
      {contact.company && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3" />
          <span className="truncate">{contact.company}</span>
        </div>
      )}
      {contact.role && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3" />
          <span className="truncate">{contact.role}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {contact.source}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {contact.status}
        </Badge>
        {contact.score > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Score: {contact.score}
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Created {new Date(contact.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (pct >= 90) variant = "destructive";
  else if (pct >= 70) variant = "default";

  return (
    <Badge variant={variant} className="text-xs tabular-nums">
      {pct}% match
    </Badge>
  );
}
