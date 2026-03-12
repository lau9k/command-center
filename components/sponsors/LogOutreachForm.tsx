"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SponsorOutreach, OutreachType, OutreachStatus } from "@/lib/types/database";

interface LogOutreachFormProps {
  sponsorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (entry: SponsorOutreach) => void;
}

const OUTREACH_TYPES: { value: OutreachType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Phone Call" },
  { value: "meeting", label: "Meeting" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
];

const OUTREACH_STATUSES: { value: OutreachStatus; label: string }[] = [
  { value: "sent", label: "Sent" },
  { value: "replied", label: "Replied" },
  { value: "no_response", label: "No Response" },
  { value: "follow_up_needed", label: "Follow Up Needed" },
];

export function LogOutreachForm({ sponsorId, open, onOpenChange, onCreated }: LogOutreachFormProps) {
  const [type, setType] = useState<OutreachType>("email");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OutreachStatus>("sent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setType("email");
    setSubject("");
    setNotes("");
    setStatus("sent");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject: subject.trim() || null,
          notes: notes.trim() || null,
          status,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        onCreated(data);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Outreach</DialogTitle>
          <DialogDescription>
            Record a new outreach attempt with this sponsor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outreach-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as OutreachType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outreach-subject">Subject</Label>
            <Input
              id="outreach-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject or meeting title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outreach-notes">Notes</Label>
            <Textarea
              id="outreach-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed or sent..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outreach-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as OutreachStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Log Outreach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
