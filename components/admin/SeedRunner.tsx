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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedModule = "all" | "contacts" | "tasks" | "projects" | "sponsors";

interface SeedResult {
  module: SeedModule;
  success: boolean;
  count: number;
  message: string;
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
          success: true,
          count: data.total_seeded ?? 0,
          message: `Seeded ${data.total_seeded ?? 0} records`,
          timestamp: new Date().toISOString(),
        };

        setResults((prev) => [result, ...prev]);
        toast.success(result.message);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        const result: SeedResult = {
          module,
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
                disabled={running !== null}
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
            <CardContent>
              <Button
                className="w-full"
                onClick={() => runSeed(mod.key)}
                disabled={running !== null}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results log */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Action Log</CardTitle>
            <CardDescription>
              Recent seed operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={`${r.timestamp}-${i}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={r.success ? "default" : "destructive"}>
                      {r.success ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-sm">{r.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
