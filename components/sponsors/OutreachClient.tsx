"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { Sponsor, SponsorStatus } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkOutreachForm } from "@/components/sponsors/BulkOutreachForm";
import {
  OutreachDraftPreview,
  type OutreachDraft,
} from "@/components/sponsors/OutreachDraftPreview";

const STATUS_OPTIONS: { value: SponsorStatus | "all"; label: string }[] = [
  { value: "all", label: "All Stages" },
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "negotiating", label: "Negotiating" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
];

const STATUS_COLORS: Record<SponsorStatus, string> = {
  not_contacted: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  negotiating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  silver: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  platinum: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  title: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

interface OutreachClientProps {
  sponsors: Sponsor[];
}

export function OutreachClient({ sponsors }: OutreachClientProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);

  const filteredSponsors = useMemo(() => {
    let result = sponsors;

    if (stageFilter && stageFilter !== "all") {
      result = result.filter((s) => s.status === stageFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
          (s.contact_email && s.contact_email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [sponsors, stageFilter, search]);

  const allFilteredSelected =
    filteredSponsors.length > 0 &&
    filteredSponsors.every((s) => selectedIds.has(s.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const s of filteredSponsors) next.delete(s.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const s of filteredSponsors) next.add(s.id);
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatStatus(status: SponsorStatus): string {
    return status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return (
    <div className="space-y-6">
      {/* Bulk Outreach Form */}
      <BulkOutreachForm
        selectedSponsorIds={Array.from(selectedIds)}
        onDraftsGenerated={setDrafts}
      />

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sponsors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sponsors Table */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all sponsors"
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  Sponsor
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  Tier
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  Stage
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSponsors.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No sponsors found
                  </td>
                </tr>
              ) : (
                filteredSponsors.map((sponsor) => (
                  <tr
                    key={sponsor.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selectedIds.has(sponsor.id)}
                        onCheckedChange={() => toggleOne(sponsor.id)}
                        aria-label={`Select ${sponsor.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      {sponsor.name}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {sponsor.contact_name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {sponsor.contact_email ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TIER_COLORS[sponsor.tier] ?? ""}`}
                      >
                        {sponsor.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[sponsor.status] ?? ""}`}
                      >
                        {formatStatus(sponsor.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Drafts */}
      <OutreachDraftPreview drafts={drafts} />
    </div>
  );
}
