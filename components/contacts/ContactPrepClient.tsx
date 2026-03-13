"use client";

import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Star,
  CalendarDays,
  MessageSquare,
  Calendar,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { PrepTimeline } from "@/components/contacts/PrepTimeline";
import { PrepOpenItems } from "@/components/contacts/PrepOpenItems";
import { PrepPersonizeContext } from "@/components/contacts/PrepPersonizeContext";
import { PrepTalkingPoints } from "@/components/contacts/PrepTalkingPoints";
import { pipelineQualifiedBadgeClass } from "@/lib/design-tokens";
import type { PrepResponse } from "@/app/api/contacts/[id]/prep/route";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ContactPrepClientProps {
  prepData: PrepResponse;
}

export function ContactPrepClient({ prepData }: ContactPrepClientProps) {
  const { contact, conversations, meetings, tasks, pipeline_items } = prepData;

  const qualifiedBadge = contact.qualified_status
    ? pipelineQualifiedBadgeClass[contact.qualified_status] ??
      "bg-muted text-muted-foreground"
    : null;

  return (
    <>
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link href="/contacts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Contacts
          </Button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-lg font-semibold">Meeting Prep</h2>
      </div>

      {/* Contact Summary Header */}
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
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                Last contact: {formatDate(contact.last_contact_date)}
              </span>
            </div>

            {/* Quick stats */}
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium">
                <MessageSquare className="size-3 text-blue-500" />
                {conversations.length} conversations
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium">
                <Calendar className="size-3 text-purple-500" />
                {meetings.length} meetings
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium">
                <CheckSquare className="size-3 text-orange-500" />
                {tasks.length} tasks
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium">
                <TrendingUp className="size-3 text-green-500" />
                {pipeline_items.length} deals
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column: Timeline + Open Items */}
        <div className="min-w-0 space-y-6">
          {/* Talking Points */}
          <PrepTalkingPoints
            contact={contact}
            tasks={tasks}
            pipelineItems={pipeline_items}
            conversations={conversations}
            meetings={meetings}
          />

          {/* Activity Timeline */}
          <PrepTimeline
            conversations={conversations}
            meetings={meetings}
            tasks={tasks}
            pipelineItems={pipeline_items}
          />
        </div>

        {/* Right column: Open Items + Personize Context */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <PrepOpenItems
            tasks={tasks}
            pipelineItems={pipeline_items}
            conversations={conversations}
          />
          <PrepPersonizeContext
            contactId={contact.id}
            contactName={contact.name}
          />
        </aside>
      </div>
    </>
  );
}
