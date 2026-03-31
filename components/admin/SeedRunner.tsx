"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Database,
  Loader2,
  Play,
  Users,
  ListTodo,
  FolderKanban,
  Award,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedModule = "all" | "contacts" | "tasks" | "projects" | "sponsors";
type ClearableModule = Exclude<SeedModule, "all">;

interface ModuleDetail {
  seeded: number;
  error?: string;
}

interface SeedResult {
  module: SeedModule;
  action: "seed" | "clear";
  success: boolean;
  count: number;
  message: string;
  details?: Record<string, ModuleDetail>;
  timestamp: string;
}

interface SeedModuleConfig {
  key: SeedModule;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SEED_MODULES: SeedModuleConfig[] = [
  {
    key: "all",
    label: "All Modules",
    description: "Seed all modules at once",
    icon: <Database className="h-5 w-5" />,
  },
  {
    key: "contacts",
    label: "Contacts",
    description: "Seed demo contacts with companies",
    icon: <Users className="h-5 w-5" />,
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Seed tasks across projects",
    icon: <ListTodo className="h-5 w-5" />,
  },
  {
    key: "projects",
    label: "Projects & Pipeline",
    description: "Seed projects, pipelines, and deals",
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    key: "sponsors",
    label: "Sponsors",
    description: "Seed sponsor records for events",
    icon: <Award className="h-5 w-5" />,
  },
];

const COUNT_OPTIONS = [5, 10, 25, 50];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeedRunner() {
  const [count, setCount] = useState(10);
  const [running, setRunning] = useState<SeedModule | null>(null);
  const [clearing, setClearing] = useState<ClearableModule | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SeedResult[]>([]);

  const runSeed = useCallback(
    async (module: SeedModule) => {
      setRunning(module);
      setProgress(10);

      try {
        setProgress(30);

        const res = await fetch("/api/admin/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module, count }),
        });

        setProgress(80);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Seed operation failed");
        }

        setProgress(100);

        const result: SeedResult = {
          module,
          action: "seed",
          success: true,
          count: data.total_seeded ?? 0,
          message: `Seeded ${data.total_seeded ?? 0} records`,
          details: data.details,
          timestamp: new Date().toISOString(),
        };

        setResults((prev) => [result, ...prev]);
        toast.success(result.message);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        const result: SeedResult = {
          module,
          action: "seed",
          success: false,
          count: 0,
          message,
          timestamp: new Date().toISOString(),
        };

        setResults((prev) => [result, ...prev]);
        toast.error(message);
      } finally {
        setRunning(null);
        setProgress(0);
      }
    },
    [count],
  );

  const clearModule = useCallback(async (module: ClearableModule) => {
    setClearing(module);

    try {
      const res = await fetch("/api/admin/seed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Clear operation failed");
      }

      const result: SeedResult = {
        module,
        action: "clear",
        success: true,
        count: data.deleted ?? 0,
        message: `Cleared ${data.deleted ?? 0} ${module} records`,
        timestamp: new Date().toISOString(),
      };

      setResults((prev) => [result, ...prev]);
      toast.success(result.message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";

      const result: SeedResult = {
        module,
        action: "clear",
        success: false,
        count: 0,
        message,
        timestamp: new Date().toISOString(),
      };

      setResults((prev) => [result, ...prev]);
      toast.error(message);
    } finally {
      setClearing(null);
    }
  }, []);

  const isBusy = running !== null || clearing !== null;

  return (
    <div className="space-y-6">
      {/* Count selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seed Configuration</CardTitle>
          <CardDescription>
            Select the number of records to generate per module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={count === n ? "default" : "outline"}
                size="sm"
                onClick={() => setCount(n)}
                disabled={isBusy}
              >
                {n} records
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      {running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Seeding {running}…
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {clearing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Clearing {clearing}…
        </div>
      )}

      {/* Module buttons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEED_MODULES.map((mod) => (
          <Card key={mod.key} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {mod.icon}
                <CardTitle className="text-base">{mod.label}</CardTitle>
              </div>
              <CardDescription className="text-sm">
                {mod.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => runSeed(mod.key)}
                disabled={isBusy}
              >
                {running === mod.key ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Seed {mod.label}
                  </>
                )}
              </Button>
              {mod.key !== "all" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isBusy}
                      title={`Clear all ${mod.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear all {mod.label.toLowerCase()}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {mod.label.toLowerCase()} records.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearModule(mod.key as ClearableModule)}
                      >
                        Clear {mod.label}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results log */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Action Log</CardTitle>
            <CardDescription>Recent seed operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={`${r.timestamp}-${i}`}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={r.success ? "default" : "destructive"}>
                        {r.success ? (r.action === "clear" ? "Cleared" : "Seeded") : "Failed"}
                      </Badge>
                      <span className="text-sm">{r.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {r.details && (
                    <div className="flex flex-wrap gap-2 ml-1">
                      {Object.entries(r.details).map(([mod, detail]) => (
                        <Badge key={mod} variant="outline" className="text-xs">
                          {mod}: {detail.seeded}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
