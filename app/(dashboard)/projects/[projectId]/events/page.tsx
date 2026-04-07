import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { Event } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { statusBadgeClass } from "@/lib/design-tokens";
import { CalendarDays, MapPin, Users, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function EventsListPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createServiceClient();

  const [{ data: events }, { count: totalSponsors }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: true, nullsFirst: false })
      .returns<Event[]>(),
    supabase
      .from("sponsors")
      .select("id", { count: "exact", head: true })
      .in(
        "event_id",
        (
          await supabase
            .from("events")
            .select("id")
            .eq("project_id", projectId)
        ).data?.map((e) => e.id) ?? [],
      ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Events</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage hackathon events and track their progress
        </p>
      </div>

      {events && events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/projects/${projectId}/events/${event.id}`}
              className="block transition-shadow hover:shadow-md rounded-lg"
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <Badge className={statusBadgeClass[event.status] ?? ""}>
                      {event.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {event.date && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      {event.budget_target > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium text-foreground">
                            {formatCurrency(event.budget_target)}
                          </span>
                        </div>
                      )}
                      {event.participant_target > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium text-foreground">
                            {event.participant_target} participants
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to start tracking hackathons and meetups for this project."
        />
      )}
    </div>
  );
}
