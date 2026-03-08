"use client";

import type { Contact } from "@/lib/types/database";
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
  if (!dateStr) return "—";
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

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Score</TableHead>
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
              <TableCell>{contact.company ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {contact.email ?? "—"}
              </TableCell>
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
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {formatDate(contact.last_contact_date ?? contact.updated_at)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {contact.score ?? 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
