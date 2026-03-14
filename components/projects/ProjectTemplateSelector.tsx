"use client";

import {
  FileText,
  Trophy,
  Rocket,
  Handshake,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectTemplate } from "@/lib/project-templates";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Trophy,
  Rocket,
  Handshake,
};

interface ProjectTemplateSelectorProps {
  selectedId: string | null;
  onSelect: (template: ProjectTemplate) => void;
}

export function ProjectTemplateSelector({
  selectedId,
  onSelect,
}: ProjectTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Choose a template
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a starter kit or start from scratch
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROJECT_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon] ?? FileText;
          const isSelected = selectedId === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => onSelect(template)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: template.color }}
                    />
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-foreground">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                {(template.tasks.length > 0 ||
                  template.pipelineStages.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {template.tasks.length > 0 && (
                      <Badge variant="secondary">
                        {template.tasks.length} task
                        {template.tasks.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {template.pipelineStages.length > 0 && (
                      <Badge variant="secondary">
                        {template.pipelineStages.length} pipeline stage
                        {template.pipelineStages.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
