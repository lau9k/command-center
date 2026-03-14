"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ListTodo,
  GitBranchPlus,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectTemplateSelector } from "./ProjectTemplateSelector";
import type { ProjectTemplate } from "@/lib/project-templates";

const STEPS = [
  { id: "template", label: "Select Template" },
  { id: "configure", label: "Configure" },
  { id: "preview", label: "Preview & Create" },
] as const;

export function ProjectSetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Step 1: Template
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);

  // Step 2: Configure
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canGoNext = useCallback(() => {
    if (currentStep === 0) return selectedTemplate !== null;
    if (currentStep === 1) return projectName.trim().length > 0;
    return true;
  }, [currentStep, selectedTemplate, projectName]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, canGoNext]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          name: projectName.trim(),
          description: projectDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create project");
        return;
      }

      const data = await res.json();
      toast.success("Project created successfully!");
      router.push(`/projects/${data.projectId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [selectedTemplate, projectName, projectDescription, router]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span>{STEPS[currentStep].label}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div>
        {currentStep === 0 && (
          <ProjectTemplateSelector
            selectedId={selectedTemplate?.id ?? null}
            onSelect={(template) => setSelectedTemplate(template)}
          />
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Configure your project
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Using the{" "}
                <span className="font-medium text-foreground">
                  {selectedTemplate?.name}
                </span>{" "}
                template
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-card p-6">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="My awesome project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="project-description"
                  placeholder="What is this project about?"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && selectedTemplate && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Review and create
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Here&apos;s what will be created for your project
              </p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {projectName}
                </CardTitle>
                {projectDescription && (
                  <p className="text-sm text-muted-foreground">
                    {projectDescription}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Template: {selectedTemplate.name}
                  </Badge>
                  <Badge variant="secondary">Status: Active</Badge>
                </div>
              </CardContent>
            </Card>

            {selectedTemplate.tasks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {selectedTemplate.tasks.length} Task
                      {selectedTemplate.tasks.length !== 1 ? "s" : ""}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedTemplate.tasks.map((task, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">{task.title}</span>
                        <Badge
                          variant="outline"
                          className="capitalize text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {selectedTemplate.pipelineStages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <GitBranchPlus className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {selectedTemplate.pipelineStages.length} Pipeline Stage
                      {selectedTemplate.pipelineStages.length !== 1 ? "s" : ""}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.pipelineStages.map((stage) => (
                      <Badge
                        key={stage.slug}
                        variant="outline"
                        className="gap-1.5"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTemplate.tasks.length === 0 &&
              selectedTemplate.pipelineStages.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    An empty project will be created. You can add tasks and
                    pipeline stages later.
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button variant="ghost" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div>
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-1.5"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
