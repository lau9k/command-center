import { createClient } from "@/lib/supabase/server";
import { ContentKanban } from "@/components/content/ContentKanban";
import type { ContentPost } from "@/lib/types/database";

export default async function ContentQueuePage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("content_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Content Queue</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Manage your content pipeline with drag-and-drop
        </p>
      </div>

      <ContentKanban initialPosts={(posts as ContentPost[]) ?? []} />
    </div>
  );
}
