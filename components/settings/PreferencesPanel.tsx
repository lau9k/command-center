"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsThemeToggle } from "@/app/(dashboard)/settings/SettingsThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface PreferencesPanelProps {
  userId: string | null;
}

export function PreferencesPanel({ userId }: PreferencesPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [defaultProjectFilter, setDefaultProjectFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load projects and current preferences
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        const [projectsRes, prefsRes] = await Promise.all([
          supabase
            .from("projects")
            .select("id, name")
            .order("name", { ascending: true }),
          userId
            ? fetch(`/api/settings?user_id=${userId}`)
            : null,
        ]);

        if (projectsRes.data) {
          setProjects(projectsRes.data);
        }

        if (prefsRes?.ok) {
          const { data } = await prefsRes.json();
          if (data?.default_project_filter) {
            setDefaultProjectFilter(data.default_project_filter);
          }
        }
      } catch {
        // Silently fail — defaults are fine
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [userId]);

  const handleSave = useCallback(async () => {
    if (!userId) {
      toast.error("Not signed in");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          default_project_filter:
            defaultProjectFilter === "all" ? null : defaultProjectFilter,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to save");
      }

      toast.success("Preferences saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setSaving(false);
    }
  }, [userId, defaultProjectFilter]);

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-sm text-muted-foreground">
            Switch between dark and light mode
          </p>
        </div>
        <SettingsThemeToggle />
      </div>

      {/* Default Project Filter */}
      <div className="space-y-2">
        <Label htmlFor="default-project">Default Project Filter</Label>
        <Select
          value={defaultProjectFilter}
          onValueChange={setDefaultProjectFilter}
          disabled={!loaded}
        >
          <SelectTrigger className="w-full sm:max-w-xs" id="default-project">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose which project to show by default across dashboard views
        </p>
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
