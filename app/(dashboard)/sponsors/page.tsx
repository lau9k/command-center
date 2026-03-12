import { createServiceClient } from "@/lib/supabase/service";
import { SponsorsBoard } from "@/components/sponsors/SponsorsBoard";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const supabase = createServiceClient();

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sponsors</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track sponsor outreach and manage sponsorship pipeline
        </p>
      </div>
      <SponsorsBoard sponsors={sponsors ?? []} />
    </div>
  );
}
