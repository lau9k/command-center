"use client";

import { useRouter } from "next/navigation";
import {
  UserPlus,
  CheckSquare,
  Layers,
  Calendar,
  FileText,
} from "lucide-react";

const actions = [
  {
    id: "new-contact",
    label: "New Contact",
    icon: UserPlus,
    href: "/contacts?action=new",
    accent: "#6366F1",
  },
  {
    id: "new-task",
    label: "New Task",
    icon: CheckSquare,
    href: "/tasks?action=new",
    accent: "#3B82F6",
  },
  {
    id: "new-deal",
    label: "New Deal",
    icon: Layers,
    href: "/pipeline?action=new",
    accent: "#F59E0B",
  },
  {
    id: "schedule-meeting",
    label: "Schedule Meeting",
    icon: Calendar,
    href: "/meetings?action=new",
    accent: "#22C55E",
  },
  {
    id: "create-post",
    label: "Create Post",
    icon: FileText,
    href: "/content?action=new",
    accent: "#A855F7",
  },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => router.push(action.href)}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:bg-card-hover hover:shadow-md dark:border-border dark:bg-card dark:hover:border-ring/50 dark:hover:bg-card-hover"
            >
              <div
                className="flex size-10 items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: `${action.accent}15` }}
              >
                <Icon
                  className="size-5 transition-colors"
                  style={{ color: action.accent }}
                />
              </div>
              <span className="text-sm font-medium text-foreground dark:text-foreground">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
