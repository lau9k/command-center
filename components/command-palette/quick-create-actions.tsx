"use client";

import { useCallback, useState } from "react";
import { Command } from "cmdk";
import {
  CheckSquare,
  Loader2,
  Plus,
  Users,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

type CreateType = "task" | "contact" | "pipeline";

interface QuickCreateActionsProps {
  onCreated: () => void;
}

const createOptions: Array<{
  type: CreateType;
  label: string;
  icon: typeof CheckSquare;
}> = [
  { type: "task", label: "New Task", icon: CheckSquare },
  { type: "contact", label: "New Contact", icon: Users },
  { type: "pipeline", label: "New Pipeline Item", icon: Layers },
];

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#666]";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-[#666] outline-none focus:ring-1 focus:ring-ring";

export function QuickCreateMenu({
  onSelect,
}: {
  onSelect: (type: CreateType) => void;
}) {
  return (
    <Command.Group heading="Quick Create" className={groupHeadingClass}>
      {createOptions.map((opt) => (
        <Command.Item
          key={opt.type}
          value={`create ${opt.label}`}
          onSelect={() => onSelect(opt.type)}
          className={itemClass}
        >
          <Plus className="h-4 w-4 text-[#888]" />
          {opt.label}
        </Command.Item>
      ))}
    </Command.Group>
  );
}

export function QuickCreateForm({
  type,
  onBack,
  onCreated,
}: {
  type: CreateType;
  onBack: () => void;
  onCreated: QuickCreateActionsProps["onCreated"];
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-xs text-[#888] hover:text-foreground transition-colors"
      >
        ← Back to menu
      </button>
      {type === "task" && (
        <TaskForm saving={saving} setSaving={setSaving} onCreated={onCreated} />
      )}
      {type === "contact" && (
        <ContactForm saving={saving} setSaving={setSaving} onCreated={onCreated} />
      )}
      {type === "pipeline" && (
        <PipelineForm saving={saving} setSaving={setSaving} onCreated={onCreated} />
      )}
    </div>
  );
}

function TaskForm({
  saving,
  setSaving,
  onCreated,
}: {
  saving: boolean;
  setSaving: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");

  const submit = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { title: title.trim() };
      if (projectId.trim()) body.project_id = projectId.trim();
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast.success("Task created");
      onCreated();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  }, [title, projectId, setSaving, onCreated]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 shrink-0 text-[#888]" />
        <span className="text-sm font-medium text-foreground">New Task</span>
      </div>
      <input
        autoFocus
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Project ID (optional)"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="flex h-8 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
      </button>
    </form>
  );
}

function ContactForm({
  saving,
  setSaving,
  onCreated,
}: {
  saving: boolean;
  setSaving: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const submit = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (email.trim()) body.email = email.trim();
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      toast.success("Contact created");
      onCreated();
    } catch {
      toast.error("Failed to create contact");
    } finally {
      setSaving(false);
    }
  }, [name, email, setSaving, onCreated]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0 text-[#888]" />
        <span className="text-sm font-medium text-foreground">New Contact</span>
      </div>
      <input
        autoFocus
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="flex h-8 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Contact"}
      </button>
    </form>
  );
}

function PipelineForm({
  saving,
  setSaving,
  onCreated,
}: {
  saving: boolean;
  setSaving: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [projectId, setProjectId] = useState("");

  const submit = useCallback(async () => {
    if (!title.trim() || !pipelineId.trim() || !stageId.trim() || !projectId.trim())
      return;
    setSaving(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          pipeline_id: pipelineId.trim(),
          stage_id: stageId.trim(),
          project_id: projectId.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create pipeline item");
      toast.success("Pipeline item created");
      onCreated();
    } catch {
      toast.error("Failed to create pipeline item");
    } finally {
      setSaving(false);
    }
  }, [title, pipelineId, stageId, projectId, setSaving, onCreated]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 shrink-0 text-[#888]" />
        <span className="text-sm font-medium text-foreground">New Pipeline Item</span>
      </div>
      <input
        autoFocus
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Pipeline ID"
        value={pipelineId}
        onChange={(e) => setPipelineId(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Stage ID"
        value={stageId}
        onChange={(e) => setStageId(e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Project ID"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={
          saving ||
          !title.trim() ||
          !pipelineId.trim() ||
          !stageId.trim() ||
          !projectId.trim()
        }
        className="flex h-8 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Create Pipeline Item"
        )}
      </button>
    </form>
  );
}
