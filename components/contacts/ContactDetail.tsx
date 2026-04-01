"use client";

import { useEffect, useState, useCallback } from "react";
import type { Contact } from "@/lib/types/database";
import type {
  SmartRecallRecord,
  SmartRecallUnifiedResult,
} from "@/lib/personize/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { sanitizeText } from "@/lib/sanitize";
import {
  ArrowLeft,
  Brain,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ContactDetailProps {
  contact: Contact;
  onBack: () => void;
}

interface DigestState {
  loading: boolean;
  data: SmartRecallUnifiedResult | null;
  error: string | null;
}

interface RecallState {
  loading: boolean;
  results: SmartRecallRecord[];
  error: string | null;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

function deriveTier(score: number): string {
  if (score >= 0.8) return "direct";
  if (score >= 0.5) return "partial";
  return "might";
}

export default function ContactDetail({ contact, onBack }: ContactDetailProps) {
  const [digest, setDigest] = useState<DigestState>({
    loading: false,
    data: null,
    error: null,
  });
  const [recall, setRecall] = useState<RecallState>({
    loading: false,
    results: [],
    error: null,
  });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDigest = useCallback(async () => {
    if (!contact.email) return;

    setDigest({ loading: true, data: null, error: null });

    try {
      const params = new URLSearchParams({
        email: contact.email,
        type: "Contact",
        token_budget: "1000",
      });
      const res = await fetch(`/api/personize/digest?${params}`);

      if (res.status === 503) {
        setDigest({ loading: false, data: null, error: "not_configured" });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch digest");
      }

      const json = await res.json();
      setDigest({ loading: false, data: json.data, error: null });
    } catch {
      setDigest({ loading: false, data: null, error: "Failed to load digest" });
    }
  }, [contact.email]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setRecall({ loading: true, results: [], error: null });

    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        type: "Contact",
      });
      if (contact.email) {
        params.set("email", contact.email);
      }

      const res = await fetch(`/api/personize/recall?${params}`);

      if (res.status === 503) {
        setRecall({ loading: false, results: [], error: "not_configured" });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to search memories");
      }

      const json = await res.json();
      const rawRecords = json.data?.records;
      const records: SmartRecallRecord[] = Array.isArray(rawRecords) ? rawRecords : [];
      setRecall({ loading: false, results: records, error: null });
    } catch {
      setRecall({
        loading: false,
        results: [],
        error: "Failed to search memories",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-xs" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{contact.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[contact.email, contact.company].filter(Boolean).join(" · ") ||
              "No email or company"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Personize Memory Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Personize Memory</h3>
        </div>

        {/* Digest */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Digest</CardTitle>
          </CardHeader>
          <CardContent>
            {!contact.email ? (
              <p className="text-sm text-muted-foreground">
                No email address — cannot fetch Personize digest.
              </p>
            ) : digest.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading digest...
              </div>
            ) : digest.error === "not_configured" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Personize not configured
              </div>
            ) : digest.error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {digest.error}
              </div>
            ) : !digest.data ? (
              <p className="text-sm text-muted-foreground">
                No digest available
              </p>
            ) : (
              <div className="space-y-3">
                {/* Summary */}
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                  {sanitizeText(digest.data.digest)}
                </div>

                {/* Properties */}
                {Object.keys(digest.data.properties).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(digest.data.properties).map(
                      ([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      )
                    )}
                  </div>
                )}

                {/* Records summary */}
                {digest.data.records.length > 0 && (
                  <div className="space-y-2">
                    {digest.data.records.map((record) => (
                      <div
                        key={record.recordId}
                        className="rounded-md border border-border p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {record.displayName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              Completeness:{" "}
                              {(record.completeness * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Freshness:{" "}
                              {(record.freshness * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        {record.memories.length > 0 && (
                          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                            {record.memories.map((mem, idx) => (
                              <li key={idx}>{mem}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Memories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Search Memories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search memories about this contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={recall.loading || !searchQuery.trim()}
              >
                {recall.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>

            {recall.error === "not_configured" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Personize not configured
              </div>
            ) : recall.error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {recall.error}
              </div>
            ) : recall.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching memories...
              </div>
            ) : recall.results.length > 0 ? (
              <ul className="space-y-2">
                {recall.results.map((item) => {
                  const tier = deriveTier(item.score);
                  return (
                    <li
                      key={item.recordId}
                      className="rounded-md border border-border p-3 text-sm space-y-1.5"
                    >
                      <p className="font-medium">{item.displayName}</p>
                      {item.memories.length > 0 && (
                        <ul className="list-disc pl-4 text-muted-foreground">
                          {item.memories.map((mem, idx) => (
                            <li key={idx}>{sanitizeText(mem)}</li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[tier]}`}
                        >
                          {item.score.toFixed(2)}
                        </span>
                        {item.properties.company && (
                          <Badge variant="secondary" className="text-xs">
                            {item.properties.company}
                          </Badge>
                        )}
                        {item.properties.job_title && (
                          <Badge variant="outline" className="text-xs">
                            {item.properties.job_title}
                          </Badge>
                        )}
                        {item.freshness > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Freshness: {(item.freshness * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : searchQuery && !recall.loading ? (
              <p className="text-sm text-muted-foreground">
                No memories found
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
