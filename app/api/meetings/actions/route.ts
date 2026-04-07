import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import {
  generateFollowUpEmail,
  generateIntroTemplates,
  generateMeetingDocument,
  createMeetingAction,
  updateMeetingStatus,
} from "@/lib/meetings";
import type { Meeting, MeetingActionItem, MeetingContact, MeetingActionType } from "@/lib/types/database";
import { z } from "zod";

const actionSchema = z.object({
  meeting_id: z.string().uuid(),
  action_type: z.enum([
    "follow_up_email",
    "create_document",
    "make_intro",
    "add_contact",
    "create_task",
    "custom",
  ]),
});

const dismissSchema = z.object({
  meeting_id: z.string().uuid(),
  status: z.enum(["dismissed", "reviewed"]),
});

async function getMeeting(supabase: ReturnType<typeof createServiceClient>, meetingId: string): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .single();

  if (error || !data) {
    throw new Error("Meeting not found");
  }

  return data as Meeting;
}

/**
 * POST /api/meetings/actions — Execute a meeting action
 */
export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { meeting_id, action_type } = parsed.data;
  const meeting = await getMeeting(supabase, meeting_id);

  const result = await handleAction(supabase, meeting, action_type);

  return NextResponse.json(result);
}));

/**
 * PATCH /api/meetings/actions — Update meeting status (dismiss/review)
 */
export const PATCH = withErrorHandler(withAuth(async function PATCH(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = dismissSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await updateMeetingStatus(supabase, parsed.data.meeting_id, parsed.data.status);

  return NextResponse.json({ success: true });
}));

async function handleAction(
  supabase: ReturnType<typeof createServiceClient>,
  meeting: Meeting,
  actionType: MeetingActionType
) {
  switch (actionType) {
    case "follow_up_email": {
      const emailTemplate = generateFollowUpEmail(meeting);

      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "follow_up_email",
        description: "Generated follow-up email template",
        status: "completed",
        metadata: { template: emailTemplate },
      });

      return { success: true, template: emailTemplate };
    }

    case "create_document": {
      const document = generateMeetingDocument(meeting);

      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "create_document",
        description: "Created meeting notes document",
        status: "completed",
        metadata: { document },
      });

      return { success: true, document };
    }

    case "make_intro": {
      const intros = generateIntroTemplates(meeting);

      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "make_intro",
        description: `Generated ${intros.length} introduction template(s)`,
        status: "completed",
        metadata: { intros },
      });

      return { success: true, intros, intros_count: intros.length };
    }

    case "add_contact": {
      const newContacts = meeting.new_contacts as MeetingContact[];
      let contactsAdded = 0;

      for (const contact of newContacts) {
        const { error } = await supabase.from("contacts").insert({
          name: contact.name,
          email: contact.email ?? null,
          company: contact.company ?? null,
          source: "meeting",
          tags: ["meeting-contact"],
          score: 0,
        });

        if (!error) contactsAdded++;
      }

      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "add_contact",
        description: `Added ${contactsAdded} contact(s) from meeting`,
        status: "completed",
        metadata: { contacts_added: contactsAdded },
      });

      return { success: true, contacts_added: contactsAdded };
    }

    case "create_task": {
      const actionItems = meeting.action_items as MeetingActionItem[];
      let tasksCreated = 0;

      for (const item of actionItems) {
        const { error } = await supabase.from("tasks").insert({
          title: item.title,
          description: `From meeting: ${meeting.title}`,
          status: "todo",
          priority: "medium",
          due_date: item.due_date ?? null,
        });

        if (!error) tasksCreated++;
      }

      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "create_task",
        description: `Created ${tasksCreated} task(s) from action items`,
        status: "completed",
        metadata: { tasks_created: tasksCreated },
      });

      return { success: true, tasks_created: tasksCreated };
    }

    case "custom": {
      await createMeetingAction(supabase, {
        meeting_id: meeting.id,
        action_type: "custom",
        description: "Custom action recorded",
        status: "completed",
      });

      return { success: true };
    }
  }
}
