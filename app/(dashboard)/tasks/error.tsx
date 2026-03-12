"use client";

import DashboardError from "@/components/errors/DashboardError";

export default function TasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DashboardError error={error} reset={reset} module="tasks" />;
}
