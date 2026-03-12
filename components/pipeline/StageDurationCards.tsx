import { Clock } from "lucide-react";

interface StageDuration {
  stage_id: string;
  stage_name: string;
  stage_slug: string;
  color: string | null;
  avg_days: number;
}

interface StageDurationCardsProps {
  data: StageDuration[];
}

export function StageDurationCards({ data }: StageDurationCardsProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stage duration data available</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {data.map((stage) => (
        <div
          key={stage.stage_id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <div
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color ?? "#3B82F6" }}
            />
            <span className="truncate text-xs font-medium text-muted-foreground">
              {stage.stage_name}
            </span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold leading-none text-foreground">
              {stage.avg_days}
            </span>
            <span className="mb-0.5 text-xs text-muted-foreground">days</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>avg duration</span>
          </div>
        </div>
      ))}
    </div>
  );
}
