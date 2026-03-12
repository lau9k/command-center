"use client";

import type { Contact } from "@/lib/types/database";
import Link from "next/link";
import { MessageCircle, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactsTableProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  linkedin: "bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-600/20",
};

export function ContactsTable({ contacts, onSelectContact }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border p-12">
        <p className="text-sm text-muted-foreground">
          No contacts found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  // Detect if contacts have Personize-specific fields
  const hasPersonizeData = contacts.some((c) => c.job_title !== undefined);

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {hasPersonizeData && <TableHead>Title</TableHead>}
            <TableHead>Company</TableHead>
            {!hasPersonizeData && <TableHead>Email</TableHead>}
            {hasPersonizeData && (
              <TableHead className="text-center">Conv.</TableHead>
            )}
            {hasPersonizeData && (
              <TableHead className="text-right">Messages</TableHead>
            )}
            {!hasPersonizeData && <TableHead>Tags</TableHead>}
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="w-[70px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer"
              onClick={() => onSelectContact(contact)}
            >
              <TableCell className="font-medium">{contact.name}</TableCell>
              {hasPersonizeData && (
                <TableCell className="text-muted-foreground text-sm">
                  {contact.job_title ?? "\u2014"}
                </TableCell>
              )}
              <TableCell>{contact.company ?? "\u2014"}</TableCell>
              {!hasPersonizeData && (
                <TableCell className="text-muted-foreground">
                  {contact.email ?? "\u2014"}
                </TableCell>
              )}
              {hasPersonizeData && (
                <TableCell className="text-center">
                  {contact.has_conversation ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-500/20">
                      <MessageCircle className="size-3" />
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">\u2014</span>
                  )}
                </TableCell>
              )}
              {hasPersonizeData && (
                <TableCell className="text-right tabular-nums text-sm">
                  {contact.message_count ?? 0}
                </TableCell>
              )}
              {!hasPersonizeData && (
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tagColors[tag] ?? "bg-muted text-muted-foreground border-border"}`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">\u2014</span>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell>
                {formatDate(
                  contact.last_interaction_date ?? contact.last_contact_date ?? contact.updated_at
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {contact.priority_score ?? contact.score ?? 0}
              </TableCell>
              <TableCell>
                {!contact.record_id && (
                  <Link
                    href={`/contacts/${contact.id}/prep`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <FileSearch className="size-3.5" />
                      Prep
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
