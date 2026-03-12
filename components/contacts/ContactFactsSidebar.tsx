"use client";

import {
  Mail,
  Building2,
  Briefcase,
  Phone,
  Tag,
  Star,
  CalendarDays,
  MessageSquare,
  Calendar,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pipelineQualifiedBadgeClass } from "@/lib/design-tokens";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import type { DossierContact } from "@/app/api/contacts/[id]/dossier/route";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
};

interface ContactFactsSidebarProps {
  contact: DossierContact;
  counts: {
    conversations: number;
    meetings: number;
    tasks: number;
    pipelineItems: number;
  };
}

export function ContactFactsSidebar({ contact, counts }: ContactFactsSidebarProps) {
  const qualifiedBadge = contact.qualified_status
    ? pipelineQualifiedBadgeClass[contact.qualified_status] ?? "bg-muted text-muted-foreground"
    : null;

  return (
    <div className="space-y-4">
      {/* Identity Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <ContactAvatar name={contact.name} size="lg" />
            <h3 className="mt-3 text-lg font-semibold">{contact.name}</h3>
            {contact.role && (
              <p className="text-sm text-muted-foreground">{contact.role}</p>
            )}
            {contact.company && (
              <p className="text-sm text-muted-foreground">{contact.company}</p>
            )}
            {qualifiedBadge && (
              <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${qualifiedBadge}`}>
                {contact.qualified_status}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span>{contact.company}</span>
            </div>
          )}
          {contact.role && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="size-4 shrink-0 text-muted-foreground" />
              <span>{contact.role}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Star className="size-4 shrink-0 text-muted-foreground" />
            <span>Score: {contact.score}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span>Last contact: {formatDate(contact.last_contact_date)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Tag className="mr-1.5 inline size-4" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tagColors[tag] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interaction Counts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4 text-blue-500" />
              <span>{counts.conversations} convos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-purple-500" />
              <span>{counts.meetings} meetings</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare className="size-4 text-orange-500" />
              <span>{counts.tasks} tasks</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-green-500" />
              <span>{counts.pipelineItems} deals</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {contact.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {contact.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
