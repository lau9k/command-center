"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { KpiCard } from "@/components/ui";
import type { Sponsor, SponsorStatus, SponsorTier } from "@/lib/types/database";

const COLUMNS: { id: SponsorStatus; label: string; color: string }[] = [
  { id: "not_contacted", label: "Not Contacted", color: "#6B7280" },
  { id: "contacted", label: "Contacted", color: "#3B82F6" },
  { id: "negotiating", label: "Negotiating", color: "#F59E0B" },
  { id: "confirmed", label: "Confirmed", color: "#10B981" },
  { id: "declined", label: "Declined", color: "#EF4444" },
];

const TIER_CONFIG: Record<SponsorTier, { label: string; className: string }> = {
  bronze: { label: "Bronze", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  silver: { label: "Silver", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
  gold: { label: "Gold", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  platinum: { label: "Platinum", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  title: { label: "Title", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function TierBadge({ tier }: { tier: SponsorTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  );
}

interface SponsorsBoardProps {
  sponsors: Sponsor[];
  eventId?: string;
}

export function SponsorsBoard({ sponsors: initial, eventId }: SponsorsBoardProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initial);
  const [addingTo, setAddingTo] = useState<SponsorStatus | null>(null);
  const [addName, setAddName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<SponsorStatus, Sponsor[]>();
    for (const col of COLUMNS) map.set(col.id, []);
    for (const s of sponsors) {
      const list = map.get(s.status);
      if (list) list.push(s);
    }
    return map;
  }, [sponsors]);

  const totalSponsors = sponsors.length;
  const confirmedSponsors = useMemo(() => sponsors.filter((s) => s.status === "confirmed"), [sponsors]);
  const confirmedCount = confirmedSponsors.length;
  const confirmedRevenue = useMemo(
    () => confirmedSponsors.reduce((sum, s) => sum + Number(s.amount), 0),
    [confirmedSponsors],
  );
  const totalPipeline = useMemo(
    () => sponsors.filter((s) => s.status !== "declined").reduce((sum, s) => sum + Number(s.amount), 0),
    [sponsors],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const sponsorId = result.draggableId;
      const newStatus = result.destination.droppableId as SponsorStatus;

      const sponsor = sponsors.find((s) => s.id === sponsorId);
      if (!sponsor || sponsor.status === newStatus) return;

      setSponsors((prev) =>
        prev.map((s) => (s.id === sponsorId ? { ...s, status: newStatus, updated_at: new Date().toISOString() } : s)),
      );

      fetch("/api/sponsors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sponsorId, status: newStatus }),
      }).catch(() => {
        setSponsors((prev) =>
          prev.map((s) => (s.id === sponsorId ? { ...s, status: sponsor.status } : s)),
        );
      });
    },
    [sponsors],
  );

  const handleQuickAdd = useCallback(
    async (status: SponsorStatus) => {
      if (!addName.trim()) return;
      setIsCreating(true);
      try {
        const res = await fetch("/api/sponsors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: addName.trim(), status, ...(eventId && { event_id: eventId }) }),
        });
        if (res.ok) {
          const { data } = await res.json();
          setSponsors((prev) => [data, ...prev]);
          setAddingTo(null);
          setAddName("");
        }
      } finally {
        setIsCreating(false);
      }
    },
    [addName],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const prev = sponsors;
      setSponsors((current) => current.filter((s) => s.id !== id));
      try {
        const res = await fetch(`/api/sponsors?id=${id}`, { method: "DELETE" });
        if (!res.ok) setSponsors(prev);
      } catch {
        setSponsors(prev);
      }
    },
    [sponsors],
  );

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Sponsors" value={totalSponsors.toString()} />
        <KpiCard label="Confirmed" value={confirmedCount.toString()} />
        <KpiCard label="Confirmed Revenue" value={formatCurrency(confirmedRevenue)} />
        <KpiCard label="Total Pipeline" value={formatCurrency(totalPipeline)} />
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colSponsors = grouped.get(col.id) ?? [];
            return (
              <div key={col.id} className="flex w-[280px] shrink-0 flex-col">
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {colSponsors.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setAddingTo(col.id); setAddName(""); }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Quick Add */}
                {addingTo === col.id && (
                  <div className="mb-2 rounded-lg border border-border bg-card p-2">
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickAdd(col.id);
                        if (e.key === "Escape") { setAddingTo(null); setAddName(""); }
                      }}
                      placeholder="Sponsor name..."
                      autoFocus
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleQuickAdd(col.id)}
                        disabled={isCreating || !addName.trim()}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isCreating ? "Adding..." : "Add"}
                      </button>
                      <button
                        onClick={() => { setAddingTo(null); setAddName(""); }}
                        className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Droppable Column */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg border border-border/50 bg-muted/30 p-2 transition-colors ${
                        snapshot.isDraggingOver ? "border-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      {colSponsors.map((sponsor, index) => (
                        <Draggable key={sponsor.id} draggableId={sponsor.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow ${
                                dragSnapshot.isDragging ? "shadow-lg" : "hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="mt-0.5 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <GripVertical className="size-4" />
                                </div>
                                <Link href={`/sponsors/${sponsor.id}`} className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-foreground">{sponsor.name}</p>
                                    <TierBadge tier={sponsor.tier} />
                                  </div>
                                  {sponsor.contact_name && (
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{sponsor.contact_name}</p>
                                  )}
                                  {Number(sponsor.amount) > 0 && (
                                    <p className="mt-1 text-xs font-medium text-foreground">
                                      {formatCurrency(Number(sponsor.amount))}
                                    </p>
                                  )}
                                </Link>
                                <button
                                  onClick={() => handleDelete(sponsor.id)}
                                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
