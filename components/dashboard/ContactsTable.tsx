"use client";

import { useRef } from "react";
import type { Contact } from "@/lib/types/database";
import Link from "next/link";
import { MessageCircle, FileSearch, ArrowUpDown, Linkedin } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  onSortByRDS?: () => void;
  rdsSortDirection?: "asc" | "desc" | null;
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

function getRDSColor(score: number): {
  text: string;
  bar: string;
  badge: string;
} {
  if (score >= 70) {
    return {
      text: "text-green-700 dark:text-green-400",
      bar: "bg-green-500",
      badge: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
    };
  }
  if (score >= 30) {
    return {
      text: "text-amber-700 dark:text-amber-400",
      bar: "bg-amber-500",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  return {
    text: "text-muted-foreground",
    bar: "bg-muted-foreground/40",
    badge: "bg-muted text-muted-foreground border-border",
  };
}

function computeRDSSubScores(contact: Contact): {
  recency: number;
  volume: number;
  diversity: number;
} {
  const memCount = contact.memory_count ?? 0;
  if (memCount === 0) return { recency: 0, volume: 0, diversity: 0 };

  // Recency: decay over 180 days
  let recency = 0;
  if (contact.last_memory_at) {
    const daysSince = Math.max(
      0,
      (Date.now() - new Date(contact.last_memory_at).getTime()) / 86_400_000
    );
    recency = Math.max(0, 1 - daysSince / 180);
  }

  // Volume: log-scale capped at 50
  const volume = Math.min(1, Math.log(1 + memCount) / Math.log(1 + 50));

  // Diversity: out of 4 source types
  const sourceCount = contact.memory_sources?.length ?? 0;
  const diversity = Math.min(1, sourceCount / 4);

  return {
    recency: Math.round(recency * 100),
    volume: Math.round(volume * 100),
    diversity: Math.round(diversity * 100),
  };
}

function RelationshipDepthBadge({ contact }: { contact: Contact }) {
  const score = contact.relationship_depth_score ?? 0;
  const colors = getRDSColor(score);
  const sub = computeRDSSubScores(contact);

  return (
    <div className="group relative inline-flex items-center gap-1.5">
      {/* Segmented mini-bar */}
      <div className="flex h-2.5 w-8 gap-px overflow-hidden rounded-sm">
        <div
          className={`${score >= 30 ? (sub.recency >= 50 ? "bg-green-500" : "bg-amber-500") : "bg-muted-foreground/20"}`}
          style={{ width: `${Math.max(10, sub.recency)}%` }}
        />
        <div
          className={`${score >= 30 ? (sub.volume >= 50 ? "bg-green-500" : "bg-amber-500") : "bg-muted-foreground/20"}`}
          style={{ width: `${Math.max(10, sub.volume)}%` }}
        />
        <div
          className={`${score >= 30 ? (sub.diversity >= 50 ? "bg-green-500" : "bg-amber-500") : "bg-muted-foreground/20"}`}
          style={{ width: `${Math.max(10, sub.diversity)}%` }}
        />
      </div>
      {/* Numeric score */}
      <span className={`text-xs font-medium tabular-nums ${colors.text}`}>
        {score}
      </span>
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md group-hover:block">
        <p className={`font-semibold ${colors.text} mb-1`}>
          Depth Score: {score}/100
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground whitespace-nowrap">
          <span>Recency</span>
          <span className="text-right tabular-nums">{sub.recency}%</span>
          <span>Volume</span>
          <span className="text-right tabular-nums">{sub.volume}%</span>
          <span>Diversity</span>
          <span className="text-right tabular-nums">{sub.diversity}%</span>
        </div>
      </div>
    </div>
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

const ROW_HEIGHT = 56;

export function ContactsTable({
  contacts,
  onSelectContact,
  onSortByScore,
  scoreSortDirection,
  onSortByRDS,
  rdsSortDirection,
  isEnriching = false,
}: ContactsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

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
  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100vh-280px)] overflow-auto rounded-md border border-border"
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
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
            <TableHead className="text-right">
              {onSortByRDS ? (
                <button
                  type="button"
                  onClick={onSortByRDS}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Depth
                  <ArrowUpDown className={`size-3.5 ${rdsSortDirection ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              ) : (
                "Depth"
              )}
            </TableHead>
            <TableHead className="w-[50px]" />
            <TableHead className="w-[70px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const contact = contacts[virtualRow.index];
            return (
              <TableRow
                key={contact.id}
                className="cursor-pointer"
                onClick={() => onSelectContact(contact)}
              >
                <TableCell className="font-medium">
                  {contact.name}
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
                <TableCell className="text-right">
                  <RelationshipDepthBadge contact={contact} />
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
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} />
            </tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
