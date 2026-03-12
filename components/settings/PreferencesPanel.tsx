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
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
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

const VIEW_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "pipeline", label: "Pipeline" },
  { value: "tasks", label: "Tasks" },
  { value: "contacts", label: "Contacts" },
  { value: "content", label: "Content" },
  { value: "community", label: "Community" },
  { value: "finance", label: "Finance" },
];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function PreferencesPanel({ userId }: PreferencesPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [defaultProjectFilter, setDefaultProjectFilter] = useState<string>("all");
  const [defaultView, setDefaultView] = useState<string>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
            ? fetch(`/api/settings/preferences?user_id=${userId}`)
            : null,
        ]);

        if (projectsRes.data) {
          setProjects(projectsRes.data);
        }

        if (prefsRes?.ok) {
          const { data } = await prefsRes.json();
          if (data) {
            if (data.default_project_filter) {
              setDefaultProjectFilter(data.default_project_filter);
            }
            if (data.default_view) {
              setDefaultView(data.default_view);
            }
            if (typeof data.sidebar_collapsed === "boolean") {
              setSidebarCollapsed(data.sidebar_collapsed);
            }
            if (data.items_per_page) {
              setItemsPerPage(data.items_per_page);
            }
          }
        }
      } catch {
        // Defaults are fine
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
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          default_view: defaultView,
          sidebar_collapsed: sidebarCollapsed,
          items_per_page: itemsPerPage,
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
  }, [userId, defaultView, sidebarCollapsed, itemsPerPage]);

  return (
    <div className="space-y-8">
      {/* Appearance Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Appearance
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the look and feel of your dashboard
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">
              Choose light, dark, or follow your system preference
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Collapsed Sidebar
            </p>
            <p className="text-sm text-muted-foreground">
              Start with the sidebar collapsed by default
            </p>
          </div>
          <Switch
            checked={sidebarCollapsed}
            onCheckedChange={setSidebarCollapsed}
            disabled={!loaded}
          />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Defaults Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Defaults
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set default behaviors across the dashboard
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-view">Default View</Label>
          <Select
            value={defaultView}
            onValueChange={setDefaultView}
            disabled={!loaded}
          >
            <SelectTrigger className="w-full sm:max-w-xs" id="default-view">
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The page shown when you first open the dashboard
          </p>
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="items-per-page">Items Per Page</Label>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(v) => setItemsPerPage(Number(v))}
            disabled={!loaded}
          >
            <SelectTrigger className="w-full sm:max-w-xs" id="items-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} items
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Number of rows shown in table views
          </p>
        </div>
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
