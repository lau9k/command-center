import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  MemoryHealthClient,
  deriveStatus,
} from "@/components/dashboard/MemoryHealthClient";
import type { ContactRow } from "@/components/dashboard/MemoryHealthClient";
import type { Contact } from "@/lib/types/database";

export const metadata: Metadata = { title: "Memory Health" };
export const dynamic = "force-dynamic";

export default async function MemoryHealthPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Fetch top 50 contacts by engagement score
  const { data: rawContacts } = await supabase
    .from("contacts")
    .select("id, name, email, score, memorized_at, memory_count")
    .order("score", { ascending: false })
    .limit(50);

  const contacts: ContactRow[] = ((rawContacts ?? []) as Contact[]).map(
    (c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      score: c.score,
      memorized_at: c.memorized_at,
      memory_count: c.memory_count ?? null,
      status: deriveStatus(c),
    })
  );

  // Prefetch health stats for client hydration
  await queryClient.prefetchQuery({
    queryKey: ["memory", "health-stats"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/memory/health-stats`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { data: unknown };
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Health"
        description="Personize memory coverage and recall quality per contact"
      />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <MemoryHealthClient initialContacts={contacts} />
      </HydrationBoundary>
    </div>
  );
}
