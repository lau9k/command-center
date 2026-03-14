import { ProjectSetupWizard } from "@/components/projects/ProjectSetupWizard";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Create New Project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a template or build from scratch
        </p>
      </div>

      <ProjectSetupWizard />
    </div>
  );
}
