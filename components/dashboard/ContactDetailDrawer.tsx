"use client";

import type { Contact } from "@/lib/types/database";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Building2,
  Calendar,
  Star,
} from "lucide-react";
import { PersonizeMemories } from "@/components/dashboard/PersonizeMemories";

interface ContactDetailDrawerProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

const tagColors: Record<string, string> = {
  Personize: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  Hackathon: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  MEEK: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Personal: "bg-green-500/15 text-green-700 dark:text-green-400",
};

export function ContactDetailDrawer({
  contact,
  open,
  onClose,
}: ContactDetailDrawerProps) {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{contact.name}</SheetTitle>
          <SheetDescription>
            {[contact.email, contact.company].filter(Boolean).join(" · ") ||
              "No email or company"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Contact Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email ?? "No email"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company ?? "No company"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last activity:{" "}
                  {contact.last_contact_date
                    ? new Date(contact.last_contact_date).toLocaleDateString()
                    : contact.updated_at
                      ? new Date(contact.updated_at).toLocaleDateString()
                      : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Score: {contact.score ?? 0}</span>
              </div>
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {contact.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={tagColors[tag] ?? ""}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {contact.source}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {contact.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Personize Memory Section */}
          <PersonizeMemories
            contactId={contact.id}
            contactEmail={contact.email}
            open={open}
          />

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">
                      Contact created
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {contact.last_contact_date && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">
                        Last contacted
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(contact.last_contact_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">
                      Last updated
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contact.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
