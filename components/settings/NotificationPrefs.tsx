"use client";

import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
}

interface NotificationChannels {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

const CATEGORIES: NotificationCategory[] = [
  {
    id: "tasks",
    label: "Tasks",
    description: "Task assignments, due dates, and updates",
  },
  {
    id: "contacts",
    label: "Contacts",
    description: "New contacts, status changes, and enrichment",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    description: "Deal stage changes and pipeline updates",
  },
  {
    id: "content",
    label: "Content",
    description: "Content publishing, scheduling, and reviews",
  },
  {
    id: "finance",
    label: "Finance",
    description: "Invoice reminders, payments, and reports",
  },
  {
    id: "system",
    label: "System",
    description: "Security alerts, maintenance, and updates",
  },
];

const DEFAULT_PREFS: Record<string, NotificationChannels> = {
  tasks: { email: true, push: true, inApp: true },
  contacts: { email: false, push: true, inApp: true },
  pipeline: { email: true, push: true, inApp: true },
  content: { email: false, push: false, inApp: true },
  finance: { email: true, push: true, inApp: true },
  system: { email: true, push: false, inApp: true },
};

export function NotificationPrefs() {
  const [prefs, setPrefs] =
    useState<Record<string, NotificationChannels>>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-2 text-xs font-medium text-muted-foreground">
        <div>Category</div>
        <div className="text-center">Email</div>
        <div className="text-center">Push</div>
        <div className="text-center">In-App</div>
      </div>

      {/* Category rows */}
      <div className="divide-y divide-border">
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-2 py-3"
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
                checked={prefs[category.id]?.push ?? false}
                onCheckedChange={() => handleToggle(category.id, "push")}
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

      <Button onClick={handleSave} disabled={saving} className="gap-2">
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
