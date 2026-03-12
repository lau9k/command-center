"use client";

import { useState, useMemo, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Handshake } from "lucide-react";
import { KpiCard } from "@/components/ui";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { SponsorColumn } from "./SponsorColumn";
import type { Sponsor, SponsorStatus } from "@/lib/types/database";

const COLUMNS: { id: SponsorStatus; label: string; color: string }[] = [
  { id: "not_contacted", label: "Not Contacted", color: "#6B7280" },
  { id: "contacted", label: "Contacted", color: "#3B82F6" },
  { id: "negotiating", label: "Negotiating", color: "#F59E0B" },
  { id: "confirmed", label: "Confirmed", color: "#10B981" },
  { id: "declined", label: "Declined", color: "#EF4444" },
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
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

  if (sponsors.length === 0) {
    return (
      <SharedEmptyState
        icon={<Handshake className="size-12" />}
        title="No sponsors yet"
        description="Start tracking sponsorships by adding your first sponsor to the board."
        action={{
          label: "Add Sponsor",
          onClick: () => { setAddingTo("not_contacted"); setAddName(""); },
        }}
      />
    );
  }

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
              <SponsorColumn
                key={col.id}
                column={col}
                items={colSponsors}
                onQuickAdd={(status) => { setAddingTo(status); setAddName(""); }}
                onDelete={handleDelete}
                quickAddSlot={
                  addingTo === col.id ? (
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
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
