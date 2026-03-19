import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import type { Sponsor, SponsorOutreach } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Mail, User, ExternalLink, DollarSign } from "lucide-react";
import { OutreachTimeline } from "@/components/sponsors/OutreachTimeline";

export const dynamic = "force-dynamic";

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  bronze: { label: "Bronze", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  silver: { label: "Silver", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
  gold: { label: "Gold", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  platinum: { label: "Platinum", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  title: { label: "Title", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_contacted: { label: "Not Contacted", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
  contacted: { label: "Contacted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  negotiating: { label: "Negotiating", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

function formatCurrency(amount: number, currency: string): string {
  if (amount >= 1_000_000) return `${currency === "USD" ? "$" : currency}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency === "USD" ? "$" : currency}${(amount / 1_000).toFixed(1)}K`;
  return `${currency === "USD" ? "$" : currency}${amount.toLocaleString()}`;
}

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serviceClient = createServiceClient();

  const [{ data: sponsor, error: sponsorError }, { data: outreach, error: outreachError }] =
    await Promise.all([
      serviceClient.from("sponsors").select("*").eq("id", id).single<Sponsor>(),
      serviceClient
        .from("sponsor_outreach")
        .select("*")
        .eq("sponsor_id", id)
        .order("contacted_at", { ascending: false })
        .returns<SponsorOutreach[]>(),
    ]);

  if (sponsorError || !sponsor) {
    notFound();
  }

  const tierConfig = TIER_CONFIG[sponsor.tier] ?? TIER_CONFIG.bronze;
  const statusConfig = STATUS_CONFIG[sponsor.status] ?? STATUS_CONFIG.not_contacted;

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/sponsors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Sponsors
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{sponsor.name}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tierConfig.className}`}>
            {tierConfig.label}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          {Number(sponsor.amount) > 0 && (
            <Badge variant="outline" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(Number(sponsor.amount), sponsor.currency)}
            </Badge>
          )}
          {sponsor.company_url && (
            <a
              href={sponsor.company_url.startsWith("http") ? sponsor.company_url : `https://${sponsor.company_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>
      </div>

      {/* Contact Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {sponsor.contact_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact Name</p>
                  <p className="text-sm font-medium text-foreground">{sponsor.contact_name}</p>
                </div>
              </div>
            )}
            {sponsor.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${sponsor.contact_email}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {sponsor.contact_email}
                  </a>
                </div>
              </div>
            )}
            {sponsor.company_url && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a
                    href={sponsor.company_url.startsWith("http") ? sponsor.company_url : `https://${sponsor.company_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {sponsor.company_url}
                  </a>
                </div>
              </div>
            )}
          </div>
          {sponsor.notes && (
            <div className="mt-4 rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{sponsor.notes}</p>
            </div>
          )}
          {!sponsor.contact_name && !sponsor.contact_email && !sponsor.company_url && !sponsor.notes && (
            <p className="text-sm text-muted-foreground">No contact information added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Outreach Timeline */}
      <OutreachTimeline
        sponsorId={sponsor.id}
        initialOutreach={outreach ?? []}
      />
    </div>
  );
}
