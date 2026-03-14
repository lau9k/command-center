"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus } from "lucide-react";

interface FirstProjectStepProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  projectDescription: string;
  onProjectDescriptionChange: (desc: string) => void;
}

export function FirstProjectStep({
  projectName,
  onProjectNameChange,
  projectDescription,
  onProjectDescriptionChange,
}: FirstProjectStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <FolderPlus className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Create Your First Project
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Projects help you organize contacts, tasks, and deals. You can create more later.
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            placeholder="e.g. Q1 Sales Campaign"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">Description (optional)</Label>
          <Input
            id="project-description"
            placeholder="A brief description of the project"
            value={projectDescription}
            onChange={(e) => onProjectDescriptionChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
