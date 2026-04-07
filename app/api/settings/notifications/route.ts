import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const channelsSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
});

const notificationPrefsSchema = z.object({
  task_reminders: channelsSchema,
  pipeline_updates: channelsSchema,
  contact_activity: channelsSchema,
  content_publishing: channelsSchema,
  meeting_reminders: channelsSchema,
  sync_status: channelsSchema,
  webhook_failures: channelsSchema,
});

export type NotificationPrefsPayload = z.infer<typeof notificationPrefsSchema>;

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user_id parameter" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("notification_prefs")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data?.notification_prefs ?? null });
}));

export const PUT = withErrorHandler(withAuth(async function PUT(request, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { user_id, notification_prefs } = body;

  if (!user_id) {
    return NextResponse.json(
      { error: "Missing user_id in request body" },
      { status: 400 }
    );
  }

  const parsed = notificationPrefsSchema.safeParse(notification_prefs);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid notification preferences",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id,
        notification_prefs: parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("notification_prefs")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data.notification_prefs });
}));
