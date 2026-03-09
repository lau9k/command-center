"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, Users, ListTodo, FileText, Layers } from "lucide-react";

type ModuleName = "contacts" | "tasks" | "content" | "pipeline";

const MODULE_META: Record<ModuleName, { icon: React.ReactNode; label: string; description: string }> = {
  contacts: {
    icon: <Users className="size-12 text-muted-foreground/50" />,
    label: "contacts",
    description: "Import your contact list to start tracking relationships, scores, and engagement.",
  },
  tasks: {
    icon: <ListTodo className="size-12 text-muted-foreground/50" />,
    label: "tasks",
    description: "Create or import tasks to organize your work across projects.",
  },
  content: {
    icon: <FileText className="size-12 text-muted-foreground/50" />,
    label: "content",
    description: "Plan your content calendar by importing posts or creating them directly.",
  },
  pipeline: {
    icon: <Layers className="size-12 text-muted-foreground/50" />,
    label: "pipeline deals",
    description: "Track your deals and opportunities by importing or adding pipeline items.",
  },
};

interface ModuleEmptyStateProps {
  module: ModuleName;
}

export function ModuleEmptyState({ module }: ModuleEmptyStateProps) {
  const meta = MODULE_META[module];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center">
      {meta.icon}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-foreground">
          No {meta.label} yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {meta.description}
        </p>
      </div>
      <Link href={`/import?module=${module}`}>
        <Button className="mt-2 gap-2">
          <Upload className="size-4" />
          Import your first {meta.label}
        </Button>
      </Link>
    </div>
  );
}
