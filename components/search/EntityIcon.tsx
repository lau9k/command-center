"use client";

import {
  Calendar,
  CheckSquare,
  Users,
  BarChart3,
  FileText,
  Handshake,
  FolderOpen,
} from "lucide-react";
import type { SearchEntityType } from "@/lib/search";

const ICON_MAP: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  contact: Users,
  pipeline: BarChart3,
  content: FileText,
  sponsor: Handshake,
  project: FolderOpen,
  meeting: Calendar,
};

interface EntityIconProps {
  type: SearchEntityType;
  className?: string;
}

export function EntityIcon({ type, className }: EntityIconProps) {
  const Icon = ICON_MAP[type];
  return <Icon className={className} />;
}
