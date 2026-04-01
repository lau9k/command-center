"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
}

interface NotificationChannels {
  email: boolean;
  inApp: boolean;
}

const CATEGORIES: NotificationCategory[] = [
  {
    id: "task_reminders",
    label: "Task Reminders",
    description: "Due dates, assignments, and overdue alerts",
  },
  {
    id: "pipeline_updates",
    label: "Pipeline Updates",
    description: "Deal stage changes and pipeline activity",
  },
  {
    id: "contact_activity",
    label: "Contact Activity",
    description: "New contacts, status changes, and enrichment",
  },
  {
    id: "content_publishing",
    label: "Content Publishing",
    description: "Scheduled posts, reviews, and publish confirmations",
  },
  {
    id: "meeting_reminders",
    label: "Meeting Reminders",
    description: "Upcoming meetings and schedule changes",
  },
  {
    id: "sync_status",
    label: "Sync Status Alerts",
    description: "Data source sync successes and failures",
  },
  {
    id: "webhook_failures",
    label: "Webhook Failures",
    description: "Failed webhook deliveries and retries",
  },
];

const DEFAULT_PREFS: Record<string, NotificationChannels> = {
  task_reminders: { email: true, inApp: true },
  pipeline_updates: { email: true, inApp: true },
  contact_activity: { email: false, inApp: true },
  content_publishing: { email: false, inApp: true },
  meeting_reminders: { email: true, inApp: true },
  sync_status: { email: false, inApp: true },
  webhook_failures: { email: true, inApp: true },
};

interface NotificationPrefsProps {
  userId?: string | null;
}

export function NotificationPrefs({ userId }: NotificationPrefsProps) {
  const [prefs, setPrefs] =
    useState<Record<string, NotificationChannels>>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadPrefs() {
      try {
        const res = await fetch(
          `/api/settings/notifications?user_id=${userId}`
        );
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setPrefs((prev) => ({ ...prev, ...data }));
          }
        }
      } catch {
        // Use defaults on failure
      } finally {
        setLoading(false);
      }
    }

    loadPrefs();
  }, [userId]);

  const handleToggle = useCallback(
    (categoryId: string, channel: keyof NotificationChannels) => {
      setPrefs((prev) => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          [channel]: !prev[categoryId][channel],
        },
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!userId) {
      toast.error("Not signed in");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          notification_prefs: prefs,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to save");
      }

      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setSaving(false);
    }
  }, [userId, prefs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_60px_60px] items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10 mx-auto" />
          <Skeleton className="h-4 w-10 mx-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_60px_60px] items-center gap-2"
          >
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9 mx-auto rounded-full" />
            <Skeleton className="h-5 w-9 mx-auto rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_60px_60px] items-center gap-2 text-xs font-medium text-muted-foreground">
        <div>Category</div>
        <div className="text-center">Email</div>
        <div className="text-center">In-App</div>
      </div>

      {/* Category rows */}
      <div className="divide-y divide-border">
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="grid grid-cols-[1fr_60px_60px] items-center gap-2 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {category.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.description}
              </p>
            </div>
            <div className="flex justify-center">
              <Switch
                checked={prefs[category.id]?.email ?? false}
                onCheckedChange={() => handleToggle(category.id, "email")}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={prefs[category.id]?.inApp ?? false}
                onCheckedChange={() => handleToggle(category.id, "inApp")}
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving || !userId} className="gap-2">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
