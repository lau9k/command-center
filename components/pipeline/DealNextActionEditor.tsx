"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil, CheckCircle2, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  nextAction: string | undefined;
  nextActionDue: string | undefined;
  onUpdate: (nextAction: string, nextActionDue: string | null) => Promise<void>;
}

export function DealNextActionEditor({ nextAction, nextActionDue, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(nextAction ?? "");
  const [draftDate, setDraftDate] = useState<Date | undefined>(
    nextActionDue ? new Date(nextActionDue) : undefined
  );
  const [saving, setSaving] = useState(false);

  // Sync draft when prop changes (item switch)
  if (!open && draft !== (nextAction ?? "")) {
    setDraft(nextAction ?? "");
    setDraftDate(nextActionDue ? new Date(nextActionDue) : undefined);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const dateIso = draftDate ? draftDate.toISOString().slice(0, 10) : null;
      await onUpdate(draft.trim(), dateIso);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDone() {
    setSaving(true);
    try {
      // Clear current next action; open editor for the next one
      await onUpdate("", null);
      setDraft("");
      setDraftDate(undefined);
      setOpen(true);
    } finally {
      setSaving(false);
    }
  }

  const hasNextAction = Boolean(nextAction && nextAction.trim().length > 0);

  return (
    <div className="rounded-lg bg-sidebar-accent p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Next Action
        </h4>
        <div className="flex items-center gap-1">
          {hasNextAction && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleMarkDone}
              disabled={saving}
            >
              <CheckCircle2 className="size-3.5" />
              Mark done + set next
            </Button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Next steps
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="Send proposal, schedule follow-up, etc."
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Due
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !draftDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="size-3.5" />
                        {draftDate ? format(draftDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={draftDate}
                        onSelect={setDraftDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {hasNextAction ? (
        <>
          <p className="text-base font-medium text-foreground">{nextAction}</p>
          {nextActionDue && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-background/50 px-2 py-0.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              {format(new Date(nextActionDue), "PPP")}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          No next action set. Click Edit to add one.
        </p>
      )}
    </div>
  );
}
