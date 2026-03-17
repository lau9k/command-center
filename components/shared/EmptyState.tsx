"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface SharedEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export function SharedEmptyState({ icon, title, description, action }: SharedEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center">
      <div className="text-muted-foreground/50 [&_svg]:size-12">{icon}</div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action && (
        action.href ? (
          <Button asChild className="mt-2">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : action.onClick ? (
          <Button onClick={action.onClick} className="mt-2">
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  );
}
