"use client";

import DashboardError from "@/components/errors/DashboardError";

export default function HackathonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DashboardError error={error} reset={reset} module="hackathon" />;
}
