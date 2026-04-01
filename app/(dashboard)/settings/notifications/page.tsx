import { createClient } from "@/lib/supabase/server";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

export default async function NotificationsSettingsPage() {
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Notification Preferences
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how and when you receive notifications
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <NotificationPrefs userId={userId} />
      </div>
    </div>
  );
}
