import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import type { Event, Sponsor } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { statusBadgeClass } from "@/lib/design-tokens";
import {
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { EventDetailTabs } from "@/components/events/EventDetailTabs";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; eventId: string }>;
}) {
  const { projectId, eventId } = await params;
  const supabase = createServiceClient();

  const [{ data: event, error }, { data: sponsors }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single<Event>(),
    supabase
      .from("sponsors")
      .select("*")
      .eq("event_id", eventId)
      .order("updated_at", { ascending: false })
      .returns<Sponsor[]>(),
  ]);

  if (error || !event) {
    notFound();
  }

  const sponsorList = sponsors ?? [];
  const confirmedSponsors = sponsorList.filter((s) => s.status === "confirmed");
  const confirmedRevenue = confirmedSponsors.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );
  const totalPipeline = sponsorList
    .filter((s) => s.status !== "declined")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/events`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {event.name}
            </h2>
            <Badge className={statusBadgeClass[event.status] ?? ""}>
              {event.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {event.date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(event.date)}
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.location}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget Target</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(event.budget_target)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Participant Target
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {event.participant_target}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Confirmed Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(confirmedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {confirmedSponsors.length} confirmed sponsors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pipeline
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPipeline)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sponsorList.length} total sponsors
            </p>
          </CardContent>
        </Card>
      </div>

      <EventDetailTabs
        eventId={eventId}
        projectId={projectId}
        sponsors={sponsorList}
      />
    </div>
  );
}
