"use client";

import { useRouter } from "next/navigation";
import { CheckSquare, FileText, Users } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { ProjectBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export interface ActivityItem {
  id: string;
  type: "task" | "content" | "contact";
  title: string;
  projectName: string | null;
  projectColor: string | null;
  updatedAt: string;
  href: string;
}

function TypeIcon({ type }: { type: ActivityItem["type"] }) {
  const iconClass = "size-4";
  switch (type) {
    case "task":
      return <CheckSquare className={`${iconClass} text-[#3B82F6]`} />;
    case "content":
      return <FileText className={`${iconClass} text-[#A855F7]`} />;
    case "contact":
      return <Users className={`${iconClass} text-[#22C55E]`} />;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const columns: ColumnDef<ActivityItem>[] = [
  {
    id: "icon",
    header: "",
    cell: (row) => <TypeIcon type={row.type} />,
  },
  {
    id: "title",
    header: "Title",
    accessorKey: "title",
    sortable: true,
    cell: (row) => (
      <span className="truncate text-[#FAFAFA]">{row.title}</span>
    ),
  },
  {
    id: "project",
    header: "Project",
    cell: (row) =>
      row.projectName ? (
        <ProjectBadge color={row.projectColor ?? "#A855F7"}>
          {row.projectName}
        </ProjectBadge>
      ) : (
        <span className="text-[#666666]">-</span>
      ),
  },
  {
    id: "updated",
    header: "Updated",
    accessorKey: "updatedAt",
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-[#A0A0A0]">{relativeTime(row.updatedAt)}</span>
    ),
  },
];

interface RecentActivityFeedProps {
  items: ActivityItem[];
}

export function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FAFAFA]">
          Recent Activity
        </h2>
        <EmptyState
          title="No recent activity"
          description="Activity from tasks, content, and contacts will appear here."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#FAFAFA]">Recent Activity</h2>
      <DataTable
        columns={columns}
        data={items}
        pageSize={10}
        onRowClick={(row) => router.push(row.href)}
        rowKey={(row) => row.id}
      />
    </section>
  );
}
