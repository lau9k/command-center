import { createServiceClient } from "@/lib/supabase/service";
import { SponsorSubNav } from "@/components/sponsors/SponsorSubNav";
import { OutreachClient } from "@/components/sponsors/OutreachClient";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const supabase = createServiceClient();

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sponsors</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate bulk email drafts for sponsor outreach
          </p>
        </div>
        <SponsorSubNav />
      </div>
      <OutreachClient sponsors={sponsors ?? []} />
    </div>
  );
}
