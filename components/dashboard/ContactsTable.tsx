"use client";

import type { Contact } from "@/lib/types/database";
import Link from "next/link";
import { MessageCircle, FileSearch, ArrowUpDown, Brain, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreBreakdown } from "@/lib/personize/relationship-score";

interface ContactWithScore extends Contact {
  relationship_score?: number;
  score_breakdown?: ScoreBreakdown;
}

interface ContactsTableProps {
  contacts: ContactWithScore[];
  onSelectContact: (contact: Contact) => void;
  onSortByScore?: () => void;
  scoreSortDirection?: "asc" | "desc" | null;
  isEnriching?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  linkedin: "bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-600/20",
};

function getStrengthBadge(score: number): {
  label: string;
  className: string;
  circleClassName: string;
} {
  if (score >= 80) {
    return {
      label: "Strong",
      className: "text-green-700 dark:text-green-400",
      circleClassName: "bg-green-500",
    };
  }
  if (score >= 60) {
    return {
      label: "Good",
      className: "text-blue-700 dark:text-blue-400",
      circleClassName: "bg-blue-500",
    };
  }
  if (score >= 40) {
    return {
      label: "Moderate",
      className: "text-yellow-700 dark:text-yellow-400",
      circleClassName: "bg-yellow-500",
    };
  }
  if (score >= 20) {
    return {
      label: "Weak",
      className: "text-orange-700 dark:text-orange-400",
      circleClassName: "bg-orange-500",
    };
  }
  return {
    label: "Cold",
    className: "text-muted-foreground",
    circleClassName: "bg-muted-foreground/40",
  };
}

function buildScoreTooltip(
  score: number,
  breakdown?: ScoreBreakdown
): string {
  if (!breakdown) return `Score: ${score}`;
  return [
    `Relationship Score: ${score}/100`,
    `Gmail: ${breakdown.gmail}/30`,
    `LinkedIn: ${breakdown.linkedin}/25`,
    `Enrichment: ${breakdown.enrichment}/15`,
    `Recency: ${breakdown.recency}/20`,
    `Memory: ${breakdown.memory}/10`,
  ].join("\n");
}

function getMemoryBadgeStyle(count: number | null | undefined): {
  className: string;
  label: string;
} {
  if (count === null || count === undefined) {
    return {
      className:
        "bg-muted text-muted-foreground border-border",
      label: "—",
    };
  }
  if (count >= 10) {
    return {
      className:
        "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
      label: String(count),
    };
  }
  if (count >= 1) {
    return {
      className:
        "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      label: String(count),
    };
  }
  return {
    className:
      "bg-muted text-muted-foreground border-border",
    label: "0",
  };
}

function MemoryCountBadge({ count }: { count: number | null | undefined }) {
  const { className, label } = getMemoryBadgeStyle(count);
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-medium ${className}`}
      title={
        count !== null && count !== undefined
          ? `${count} Personize memor${count === 1 ? "y" : "ies"}`
          : "Memory count unavailable"
      }
    >
      <Brain className="size-3" />
      {label}
    </span>
  );
}

function RelationshipBadge({
  score,
  breakdown,
}: {
  score: number;
  breakdown?: ScoreBreakdown;
}) {
  const badge = getStrengthBadge(score);
  return (
    <div
      className="group relative inline-flex items-center gap-1.5"
      title={buildScoreTooltip(score, breakdown)}
    >
      <span
        className={`inline-block size-2.5 rounded-full ${badge.circleClassName}`}
      />
      <span className={`text-xs font-medium ${badge.className}`}>
        {score}
      </span>
      {/* Hover tooltip with breakdown */}
      {breakdown && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md group-hover:block">
          <p className={`font-semibold ${badge.className} mb-1`}>
            {badge.label} ({score}/100)
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground whitespace-nowrap">
            <span>Gmail</span>
            <span className="text-right tabular-nums">{breakdown.gmail}/30</span>
            <span>LinkedIn</span>
            <span className="text-right tabular-nums">{breakdown.linkedin}/25</span>
            <span>Enrichment</span>
            <span className="text-right tabular-nums">{breakdown.enrichment}/15</span>
            <span>Recency</span>
            <span className="text-right tabular-nums">{breakdown.recency}/20</span>
            <span>Memory</span>
            <span className="text-right tabular-nums">{breakdown.memory}/10</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactsTable({
  contacts,
  onSelectContact,
  onSortByScore,
  scoreSortDirection,
  isEnriching = false,
}: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border p-12">
        <p className="text-sm text-muted-foreground">
          No contacts found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  const hasScores = contacts.some((c) => c.relationship_score !== undefined);

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">
              {hasScores && onSortByScore ? (
                <button
                  type="button"
                  onClick={onSortByScore}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Strength
                  <ArrowUpDown className={`size-3.5 ${scoreSortDirection ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              ) : (
                "Score"
              )}
            </TableHead>
            <TableHead className="w-[50px]" />
            <TableHead className="w-[70px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer"
              onClick={() => onSelectContact(contact)}
            >
              <TableCell className="font-medium">
                <span className="inline-flex items-center gap-2">
                  {contact.name}
                  <MemoryCountBadge count={contact.memory_count} />
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {contact.email ?? <span className="text-muted-foreground/50">{"\u2014"}</span>}
              </TableCell>
              <TableCell>
                {contact.company ? (
                  contact.company
                ) : (
                  <span className="text-muted-foreground/50">{"\u2014"}</span>
                )}
              </TableCell>
              <TableCell>
                {contact.source ? (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tagColors[contact.source] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {contact.source}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">{"\u2014"}</span>
                )}
              </TableCell>
              <TableCell>
                {formatDate(
                  contact.last_interaction_date ?? contact.last_contact_date ?? contact.updated_at
                )}
              </TableCell>
              <TableCell className="text-right">
                {contact.relationship_score !== undefined ? (
                  <RelationshipBadge
                    score={contact.relationship_score}
                    breakdown={contact.score_breakdown}
                  />
                ) : (
                  <span className="tabular-nums">
                    {contact.priority_score ?? contact.score ?? 0}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {contact.linkedin_url ? (
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="size-7">
                      <Linkedin className="size-4 text-[#0A66C2]" />
                    </Button>
                  </a>
                ) : (
                  <span className="text-muted-foreground/50">{"\u2014"}</span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/contacts/${contact.id}/prep`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <FileSearch className="size-3.5" />
                    Prep
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
