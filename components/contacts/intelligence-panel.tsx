"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, FileText, Bell } from "lucide-react";
import { MeetingBriefing } from "@/components/contacts/meeting-briefing";
import { FollowUpDetector } from "@/components/contacts/follow-up-detector";

interface IntelligencePanelProps {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  open: boolean;
  onContactClick?: (contactId: string) => void;
}

export function IntelligencePanel({
  contactId,
  contactName,
  open,
  onContactClick,
}: IntelligencePanelProps) {
  if (!open) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="size-4 text-blue-500" />
          Contact Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="briefing" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="briefing" className="gap-1">
              <FileText className="size-3" />
              AI Briefing
            </TabsTrigger>
            <TabsTrigger value="follow-ups" className="gap-1">
              <Bell className="size-3" />
              Follow-Ups
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1">
              <Brain className="size-3" />
              Relationship
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                AI
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="briefing" className="pt-3">
            <MeetingBriefing
              contactId={contactId}
              contactName={contactName}
            />
          </TabsContent>

          <TabsContent value="follow-ups" className="pt-3">
            <FollowUpDetector onContactClick={onContactClick} />
          </TabsContent>

          <TabsContent value="health" className="pt-3">
            <MeetingBriefing
              contactId={contactId}
              contactName={contactName}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
