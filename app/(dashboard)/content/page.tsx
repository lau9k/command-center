import { createClient } from "@/lib/supabase/server";
import { ContentCalendar } from "@/components/content/ContentCalendar";

export default async function ContentPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("content_posts")
    .select("*, projects(id, name, color)")
    .order("scheduled_for", { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#FAFAFA]">Content</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Plan and schedule content across platforms
        </p>
      </div>

      <ContentCalendar initialPosts={posts ?? []} />
    </div>
  );
}
