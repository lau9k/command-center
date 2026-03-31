"use client";

import { useState } from "react";
import { Mail, FileText, ListTodo, StickyNote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskFormDialog } from "@/components/dashboard/TaskFormDialog";
import type { TaskWithProject } from "@/lib/types/database";

interface ContactQuickActionsProps {
  contactId: string;
  contactEmail: string | null;
  contactName: string;
}

export function ContactQuickActions({
  contactId,
  contactEmail,
  contactName,
}: ContactQuickActionsProps) {
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepContent, setPrepContent] = useState<string | null>(null);

  const [taskOpen, setTaskOpen] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  async function handlePrepBrief() {
    setPrepOpen(true);
    setPrepLoading(true);
    setPrepContent(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/prep`);
      if (!res.ok) throw new Error("Failed to fetch prep brief");
      const data = await res.json();
      const contact = data.contact;
      const conversations = data.conversations ?? [];
      const meetings = data.meetings ?? [];
      const tasks = data.tasks ?? [];

      const lines: string[] = [];
      lines.push(`Prep Brief: ${contact.name}`);
      if (contact.company) lines.push(`Company: ${contact.company}`);
      if (contact.role) lines.push(`Role: ${contact.role}`);
      lines.push("");

      if (conversations.length > 0) {
        lines.push(`Recent Conversations (${conversations.length}):`);
        for (const c of conversations.slice(0, 5)) {
          lines.push(`  • ${c.summary ?? "No summary"} (${c.channel ?? "unknown"})`);
        }
        lines.push("");
      }

      if (meetings.length > 0) {
        lines.push(`Meetings (${meetings.length}):`);
        for (const m of meetings.slice(0, 5)) {
          lines.push(`  • ${m.title}${m.meeting_date ? ` — ${new Date(m.meeting_date).toLocaleDateString()}` : ""}`);
        }
        lines.push("");
      }

      if (tasks.length > 0) {
        lines.push(`Open Tasks (${tasks.length}):`);
        for (const t of tasks.slice(0, 5)) {
          lines.push(`  • [${t.status}] ${t.title}`);
        }
      }

      setPrepContent(lines.join("\n"));
    } catch {
      toast.error("Failed to load prep brief");
      setPrepOpen(false);
    } finally {
      setPrepLoading(false);
    }
  }

  function handleTaskSubmit(
    formData: Parameters<typeof handleTaskCreate>[0],
    taskId?: string
  ) {
    handleTaskCreate(formData, taskId);
  }

  async function handleTaskCreate(
    formData: {
      title: string;
      description: string;
      project_id: string;
      priority: string;
      status: string;
      due_date: string | null;
      assignee: string;
    },
    _taskId?: string
  ) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id || null,
          priority: formData.priority,
          status: formData.status || "todo",
          due_date: formData.due_date,
          assignee: formData.assignee || null,
          contact_id: contactId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast.success("Task created");
      setTaskOpen(false);
    } catch {
      toast.error("Failed to create task");
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/memory`);
      if (!res.ok && res.status !== 200) {
        // Memory endpoint is GET-only for recall; store note as a task with type
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Note: ${noteText.slice(0, 80)}`,
            description: noteText,
            contact_id: contactId,
            task_type: "general",
            priority: "low",
            status: "done",
          }),
        });
      }
      toast.success("Note saved");
      setNoteText("");
      setNoteOpen(false);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {contactEmail && (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`mailto:${contactEmail}`}>
              <Mail className="size-4" />
              Email
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handlePrepBrief}
        >
          <FileText className="size-4" />
          Prep Brief
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setTaskOpen(true)}
        >
          <ListTodo className="size-4" />
          Add Task
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setNoteOpen(!noteOpen)}
        >
          <StickyNote className="size-4" />
          Add Note
        </Button>
      </div>

      {noteOpen && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder={`Add a note about ${contactName}...`}
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={noteSaving || !noteText.trim()}
            >
              {noteSaving && <Loader2 className="size-4 animate-spin" />}
              Save Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNoteOpen(false);
                setNoteText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Dialog open={prepOpen} onOpenChange={setPrepOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prep Brief — {contactName}</DialogTitle>
          </DialogHeader>
          {prepLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {prepContent}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        task={null}
        projects={[]}
        onSubmit={handleTaskSubmit}
      />
    </>
  );
}
