"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { ContactFactsSidebar } from "@/components/contacts/ContactFactsSidebar";
import type { DossierResponse } from "@/app/api/contacts/[id]/dossier/route";

interface ContactPrepClientProps {
  dossier: DossierResponse;
}

export function ContactPrepClient({ dossier }: ContactPrepClientProps) {
  const { contact, conversations, meetings, tasks, pipeline_items } = dossier;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/contacts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Contacts
          </Button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-lg font-semibold">
          Meeting Prep: {contact.name}
        </h2>
      </div>

      {/* Main layout: timeline + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Timeline (main column) */}
        <div className="min-w-0">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Interaction Timeline
          </h3>
          <ContactTimeline
            conversations={conversations}
            meetings={meetings}
            tasks={tasks}
            pipelineItems={pipeline_items}
          />
        </div>

        {/* Sidebar (sticky) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ContactFactsSidebar
            contact={contact}
            counts={{
              conversations: conversations.length,
              meetings: meetings.length,
              tasks: tasks.length,
              pipelineItems: pipeline_items.length,
            }}
          />
        </aside>
      </div>
    </>
  );
}
