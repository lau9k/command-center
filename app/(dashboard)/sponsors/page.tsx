import { createServiceClient } from "@/lib/supabase/service";
import { SponsorsBoard } from "@/components/sponsors/SponsorsBoard";
import { SponsorSubNav } from "@/components/sponsors/SponsorSubNav";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const supabase = createServiceClient();

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sponsors"
        description="Track sponsor outreach and manage sponsorship pipeline"
        actions={
          <>
            <ExportButton table="sponsors" />
            <SponsorSubNav />
          </>
        }
      />
      <SponsorsBoard sponsors={sponsors ?? []} />
    </div>
  );
}
