import { ProjectOverview } from "@/components/projects/ProjectOverview";

export const dynamic = "force-dynamic";

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectOverview projectId={projectId} />;
}
