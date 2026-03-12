"use client";

import { useState } from "react";
import { SponsorsBoard } from "@/components/sponsors/SponsorsBoard";
import type { Sponsor } from "@/lib/types/database";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sponsors", label: "Sponsors" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface EventDetailTabsProps {
  eventId: string;
  projectId: string;
  sponsors: Sponsor[];
}

export function EventDetailTabs({
  eventId,
  projectId,
  sponsors,
}: EventDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
              activeTab === tab.id
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Sponsor Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                {(
                  [
                    "not_contacted",
                    "contacted",
                    "negotiating",
                    "confirmed",
                    "declined",
                  ] as const
                ).map((status) => {
                  const count = sponsors.filter(
                    (s) => s.status === status,
                  ).length;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground capitalize">
                        {status.replace("_", " ")}
                      </span>
                      <span className="font-medium text-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Tier Distribution
              </h3>
              <div className="space-y-2 text-sm">
                {(
                  ["title", "platinum", "gold", "silver", "bronze"] as const
                ).map((tier) => {
                  const count = sponsors.filter(
                    (s) => s.tier === tier,
                  ).length;
                  const revenue = sponsors
                    .filter((s) => s.tier === tier)
                    .reduce((sum, s) => sum + Number(s.amount), 0);
                  return (
                    <div
                      key={tier}
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground capitalize">
                        {tier}
                      </span>
                      <span className="font-medium text-foreground">
                        {count}
                        {revenue > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (${revenue.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sponsors" && (
        <SponsorsBoard sponsors={sponsors} eventId={eventId} />
      )}
    </div>
  );
}
