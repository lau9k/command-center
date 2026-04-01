import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ConversationDetail } from "@/components/conversations/ConversationDetail";

export const dynamic = "force-dynamic";

interface ConversationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({
  params,
}: ConversationDetailPageProps) {
  const { id } = await params;

  const supabase = createServiceClient();

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*, contacts(id, name, email, company)")
    .eq("id", id)
    .single();

  if (error || !conversation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ConversationDetail conversation={conversation} />
    </div>
  );
}
