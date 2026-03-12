import { createServiceClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types/database";

interface CreateNotificationParams {
  user_id: string;
  title: string;
  body?: string | null;
  type: NotificationType;
  project_id?: string | null;
  source?: string | null;
  action_url?: string | null;
}

/**
 * Server-side helper to create a notification.
 * Inserts into the notifications table and returns the new row.
 * Supabase Realtime will push the INSERT to subscribed clients automatically.
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.user_id,
      title: params.title,
      body: params.body ?? null,
      type: params.type,
      project_id: params.project_id ?? null,
      source: params.source ?? null,
      action_url: params.action_url ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data;
}
