"use client";

import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Star,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ContactMemoryTimeline } from "@/components/contacts/ContactMemoryTimeline";
import { ContactQuickActions } from "@/components/contacts/ContactQuickActions";
import { ContactTasksTab } from "@/components/contacts/ContactTasksTab";
import { ContactInteractionsTab } from "@/components/contacts/ContactInteractionsTab";
import { pipelineQualifiedBadgeClass } from "@/lib/design-tokens";
import type { DossierContact } from "@/app/api/contacts/[id]/dossier/route";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ContactDetailClientProps {
  contact: DossierContact;
}

export function ContactDetailClient({ contact }: ContactDetailClientProps) {
  const qualifiedBadge = contact.qualified_status
    ? pipelineQualifiedBadgeClass[contact.qualified_status] ??
      "bg-muted text-muted-foreground"
    : null;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link href="/contacts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Contacts
          </Button>
        </Link>
      </div>

      {/* Contact Header */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <ContactAvatar name={contact.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{contact.name}</h1>
              {qualifiedBadge && (
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${qualifiedBadge}`}
                >
                  {contact.qualified_status}
                </span>
              )}
              {contact.score > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  <Star className="size-3" />
                  {contact.score}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {contact.role && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-3.5" />
                  {contact.role}
                </span>
              )}
              {contact.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {contact.company}
                </span>
              )}
              {contact.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {contact.email}
                </span>
              )}
              {contact.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {contact.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                Last contact: {formatDate(contact.last_contact_date)}
              </span>
            </div>

            {contact.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {contact.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{contact.notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <ContactQuickActions
        contactId={contact.id}
        contactEmail={contact.email}
        contactName={contact.name}
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ContactMemoryTimeline contactId={contact.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <ContactTasksTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="interactions">
          <ContactInteractionsTab contactId={contact.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
