import { createServiceClient } from "@/lib/supabase/service";
import { ContentItemsList } from "../ContentItemsList";
import type { ContentItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ContentReviewPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Content Review] query error:", error.message);
  }

  const items = (data as ContentItem[]) ?? [];

  return <ContentItemsList initialItems={items} />;
}
