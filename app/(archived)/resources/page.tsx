import { createServiceClient } from "@/lib/supabase/service";
import type { Resource } from "@/lib/types/resources";
import type { Project } from "@/lib/types/database";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/export/ExportButton";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const supabase = createServiceClient();

  const [resourcesRes, projectsRes] = await Promise.all([
    supabase
      .from("resources")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (resourcesRes.error) {
    console.error("[Resources] Supabase query error:", resourcesRes.error.message);
  }
  if (projectsRes.error) {
    console.error("[Resources] Projects query error:", projectsRes.error.message);
  }

  const resources = (resourcesRes.data as Resource[]) ?? [];
  const projects = (projectsRes.data as Pick<Project, "id" | "name">[]) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Central document library for artifacts, specs, and deliverables"
        actions={<ExportButton table="resources" />}
      />

      <ResourceGrid initialResources={resources} projects={projects} />
    </div>
  );
}
