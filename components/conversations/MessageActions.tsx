"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListTodo, Copy, UserPlus } from "lucide-react";

interface MessageActionsProps {
  messageText: string;
  contactName?: string;
  conversationChannel?: string;
}

export function MessageActions({
  messageText,
  contactName,
  conversationChannel,
}: MessageActionsProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(messageText);
    toast.success("Copied to clipboard");
  }

  function handleLinkContact() {
    toast.info("Contact linking coming soon");
  }

  function openTaskDialog() {
    const snippet =
      messageText.length > 200
        ? messageText.slice(0, 200) + "..."
        : messageText;
    setTaskTitle(
      contactName
        ? `Follow up with ${contactName}`
        : "Follow up on conversation"
    );
    setTaskDescription(
      `From ${conversationChannel ?? "conversation"}:\n\n"${snippet}"`
    );
    setTaskPriority("medium");
    setTaskDialogOpen(true);
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription || null,
          priority: taskPriority,
          status: "todo",
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast.success("Task created");
      setTaskDialogOpen(false);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Create Task"
          onClick={openTaskDialog}
        >
          <ListTodo className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Link to Contact"
          onClick={handleLinkContact}
        >
          <UserPlus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Copy Text"
          onClick={handleCopy}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task from Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={creating || !taskTitle.trim()}>
              {creating ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
