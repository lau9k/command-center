"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BarChart3,
  CheckSquare,
  DollarSign,
  Handshake,
  Settings,
  Users,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof CheckSquare;
  hint: string;
  action: "dialog" | "navigate";
  href?: string;
}

const quickActions: QuickAction[] = [
  {
    id: "create-task",
    label: "Create Task",
    icon: CheckSquare,
    hint: "T",
    action: "dialog",
  },
  {
    id: "create-contact",
    label: "Create Contact",
    icon: Users,
    hint: "C",
    action: "navigate",
    href: "/contacts?new=true",
  },
  {
    id: "create-deal",
    label: "Create Deal",
    icon: Handshake,
    hint: "D",
    action: "navigate",
    href: "/pipeline?new=true",
  },
  {
    id: "go-finance",
    label: "Go to Finance",
    icon: DollarSign,
    hint: "F",
    action: "navigate",
    href: "/finance",
  },
  {
    id: "go-analytics",
    label: "Go to Analytics",
    icon: BarChart3,
    hint: "A",
    action: "navigate",
    href: "/analytics",
  },
  {
    id: "go-settings",
    label: "Go to Settings",
    icon: Settings,
    hint: "S",
    action: "navigate",
    href: "/settings",
  },
];

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#666]";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

interface CommandPaletteActionsProps {
  onOpenTaskDialog: () => void;
  onClose: () => void;
}

export default function CommandPaletteActions({
  onOpenTaskDialog,
  onClose,
}: CommandPaletteActionsProps) {
  const router = useRouter();

  const handleSelect = useCallback(
    (action: QuickAction) => {
      if (action.action === "dialog") {
        onClose();
        onOpenTaskDialog();
      } else if (action.href) {
        onClose();
        router.push(action.href);
      }
    },
    [router, onClose, onOpenTaskDialog]
  );

  return (
    <Command.Group heading="Quick Actions" className={groupHeadingClass}>
      {quickActions.map((action) => (
        <Command.Item
          key={action.id}
          value={`quick ${action.label}`}
          onSelect={() => handleSelect(action)}
          className={itemClass}
        >
          <action.icon className="h-4 w-4 text-[#888]" />
          <span className="flex-1">{action.label}</span>
          <kbd className="rounded bg-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            {action.hint}
          </kbd>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
