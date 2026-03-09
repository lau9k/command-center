"use client";

import Link from "next/link";
import {
  Users,
  ListTodo,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleStatus {
  name: string;
  icon: React.ReactNode;
  count: number;
  href: string;
  importModule: string;
}

interface ModuleHealthOverviewProps {
  contactsCount: number;
  tasksCount: number;
  contentCount: number;
  pipelineCount: number;
}

export function ModuleHealthOverview({
  contactsCount,
  tasksCount,
  contentCount,
  pipelineCount,
}: ModuleHealthOverviewProps) {
  const modules: ModuleStatus[] = [
    { name: "Contacts", icon: <Users className="size-4" />, count: contactsCount, href: "/contacts", importModule: "contacts" },
    { name: "Tasks", icon: <ListTodo className="size-4" />, count: tasksCount, href: "/tasks", importModule: "tasks" },
    { name: "Content", icon: <FileText className="size-4" />, count: contentCount, href: "/content", importModule: "content" },
    { name: "Pipeline", icon: <Layers className="size-4" />, count: pipelineCount, href: "/import?module=pipeline", importModule: "pipeline" },
  ];

  const populatedCount = modules.filter((m) => m.count > 0).length;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Module Health</h2>
          <p className="text-xs text-muted-foreground">
            {populatedCount} of {modules.length} modules have data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {modules.map((mod) => {
          const hasData = mod.count > 0;

          return (
            <div
              key={mod.name}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-all duration-150 hover:border-ring/50 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {mod.icon}
                  {mod.name}
                </div>
                {hasData ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <AlertCircle className="size-4 text-muted-foreground/50" />
                )}
              </div>

              <p className="text-lg font-bold text-foreground">
                {mod.count}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasData ? "records" : "empty"}
              </p>

              {hasData ? (
                <Link href={mod.href}>
                  <Button variant="ghost" size="sm" className="h-7 w-full gap-1 text-xs">
                    View
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/import?module=${mod.importModule}`}>
                  <Button variant="outline" size="sm" className="h-7 w-full gap-1 text-xs">
                    Import
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
