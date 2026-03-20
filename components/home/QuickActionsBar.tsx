"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  UserPlus,
  StickyNote,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsBar() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const actions = [
    {
      id: "new-task",
      label: "New Task",
      icon: Plus,
      href: "/tasks?action=new",
    },
    {
      id: "new-contact",
      label: "New Contact",
      icon: UserPlus,
      href: "/contacts?action=new",
    },
    {
      id: "log-note",
      label: "Log Note",
      icon: StickyNote,
      href: "/tasks?action=note",
    },
    {
      id: "check-inbox",
      label: "Check Inbox",
      icon: Inbox,
      href: "/contacts?tab=inbox",
    },
  ] as const;

  function handleClick(action: typeof actions[number]) {
    setLoading(action.id);
    router.push(action.href);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => handleClick(action)}
              disabled={loading === action.id}
              className="min-h-[44px] gap-2"
            >
              <Icon className="size-4" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
