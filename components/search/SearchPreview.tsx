"use client";

import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Calendar,
  Tag,
  Building2,
  Mail,
  User,
} from "lucide-react";
import {
  getEntityLabel,
  type SearchResult,
} from "@/lib/search";
import { EntityIcon } from "./EntityIcon";
import { cn } from "@/lib/utils";

interface SearchPreviewProps {
  result: SearchResult | null;
  onNavigate: (href: string) => void;
  className?: string;
}

function PreviewField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="truncate text-foreground">{value}</p>
      </div>
    </div>
  );
}

function getPreviewFields(result: SearchResult) {
  const fields: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }> = [];

  if (result.subtitle) {
    const subtitleParts = result.subtitle.split(" \u00B7 ");

    switch (result.type) {
      case "task":
        if (subtitleParts[0]) fields.push({ icon: Tag, label: "Status", value: subtitleParts[0] });
        if (subtitleParts[1]) fields.push({ icon: Tag, label: "Priority", value: subtitleParts[1] });
        break;
      case "contact":
        fields.push({ icon: result.subtitle.includes("@") ? Mail : Building2, label: result.subtitle.includes("@") ? "Email" : "Company", value: result.subtitle });
        break;
      case "pipeline":
        fields.push({ icon: Tag, label: "Stage", value: result.subtitle });
        break;
      case "content":
        if (subtitleParts[0]) fields.push({ icon: Tag, label: "Platform", value: subtitleParts[0] });
        if (subtitleParts[1]) fields.push({ icon: Tag, label: "Status", value: subtitleParts[1] });
        break;
      case "sponsor":
        if (subtitleParts[0]) fields.push({ icon: Tag, label: "Tier", value: subtitleParts[0] });
        if (subtitleParts[1]) fields.push({ icon: Tag, label: "Status", value: subtitleParts[1] });
        break;
      case "project":
        fields.push({ icon: Tag, label: "Status", value: result.subtitle });
        break;
      case "meeting":
        if (subtitleParts[0]) fields.push({ icon: Calendar, label: "Date", value: subtitleParts[0] });
        if (subtitleParts[1]) fields.push({ icon: Tag, label: "Status", value: subtitleParts[1] });
        break;
    }
  }

  return fields;
}

export function SearchPreview({
  result,
  onNavigate,
  className,
}: SearchPreviewProps) {
  const router = useRouter();

  if (!result) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className
        )}
      >
        <div className="text-center">
          <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p>Select a result to preview</p>
        </div>
      </div>
    );
  }

  const entityLabel = getEntityLabel(result.type);
  const fields = getPreviewFields(result);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <EntityIcon type={result.type} className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">{entityLabel}</span>
        </div>
        <h3 className="mt-1 truncate text-sm font-medium text-foreground">
          {result.title}
        </h3>
      </div>

      {/* Details */}
      <div className="flex-1 space-y-3 px-4 py-3">
        {fields.map((field, i) => (
          <PreviewField key={i} {...field} />
        ))}

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No additional details available.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-border px-4 py-2">
        <button
          type="button"
          onClick={() => {
            onNavigate(result.href);
            router.push(result.href);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ExternalLink className="h-3 w-3" />
          Open {entityLabel}
        </button>
      </div>
    </div>
  );
}
