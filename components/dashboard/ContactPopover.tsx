"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Linkedin, Building2, Mail, Clock, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Contact } from "@/lib/types/database";

interface ContactPopoverProps {
  contactId: string;
  children: React.ReactNode;
}

interface ContactAPIResponse {
  data: Contact;
  summary?: string;
  source: "personize" | "supabase";
}

export function ContactPopover({ contactId, children }: ContactPopoverProps) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (fetchedRef.current === contactId && contact) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(contactId)}`);
      if (!res.ok) return;
      const json: ContactAPIResponse = await res.json();
      setContact(json.data);
      setSummary(json.summary ?? null);
      fetchedRef.current = contactId;
    } catch {
      // silently fail — popover just won't show data
    } finally {
      setLoading(false);
    }
  }, [contactId, contact]);

  const handlePointerEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      setOpen(true);
      fetchContact();
    }, 300);
  }, [fetchContact]);

  const handlePointerLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="cursor-default"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 p-0"
        onPointerEnter={() => {
          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        }}
        onPointerLeave={handlePointerLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {loading && !contact ? (
          <div className="flex items-center justify-center p-4">
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : contact ? (
          <div className="space-y-3 p-4">
            {/* Header */}
            <div>
              <p className="text-sm font-semibold">{contact.name}</p>
              {(contact.job_title || contact.company) && (
                <p className="text-xs text-muted-foreground">
                  {[contact.job_title, contact.company]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-xs">
              {contact.company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0" />
                  <span>{contact.company}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="truncate hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.linkedin_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin className="size-3.5 shrink-0" />
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
              {contact.last_contact_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  <span>
                    Last contact:{" "}
                    {new Date(contact.last_contact_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            {contact.status && (
              <div>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                  {contact.status.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {/* Notes / Summary */}
            {(summary || contact.notes) && (
              <div className="border-t pt-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3.5" />
                  <span>{summary ? "Memory" : "Notes"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                  {summary || contact.notes?.slice(0, 100)}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
