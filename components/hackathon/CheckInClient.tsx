"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Search, CheckCircle2, Users, UserCheck } from "lucide-react";
import type { Contact } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CheckInClientProps {
  initialContacts: Contact[];
}

export function CheckInClient({ initialContacts }: CheckInClientProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return contacts;
    const q = debouncedSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, debouncedSearch]);

  const checkedInCount = useMemo(
    () => contacts.filter((c) => c.checked_in_at).length,
    [contacts]
  );

  const handleCheckIn = useCallback(async (contactId: string) => {
    setLoadingId(contactId);
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked_in_at: now }),
      });

      if (!res.ok) throw new Error("Check-in failed");

      const { data } = await res.json() as { data: Contact };
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? data : c))
      );
      toast.success("Checked in!");
    } catch {
      toast.error("Check-in failed — try again");
    } finally {
      setLoadingId(null);
    }
  }, []);

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex-row items-center gap-3 p-4">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-semibold">{contacts.length}</p>
            <p className="text-sm text-muted-foreground">Registered</p>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 p-4">
          <UserCheck className="size-5 text-green-500" />
          <div>
            <p className="text-2xl font-semibold">{checkedInCount}</p>
            <p className="text-sm text-muted-foreground">Checked In</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 text-base"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 && debouncedSearch.trim() && (
          <p className="py-8 text-center text-muted-foreground">
            No matching attendees found.
          </p>
        )}

        {filtered.map((contact) => {
          const isCheckedIn = !!contact.checked_in_at;

          return (
            <Card
              key={contact.id}
              className="flex-row items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">
                    {contact.name}
                  </p>
                  {isCheckedIn && (
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                      Checked In
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {contact.email}
                </p>
                {contact.company && (
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.company}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {isCheckedIn ? (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(contact.checked_in_at!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCheckIn(contact.id)}
                    disabled={loadingId === contact.id}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="size-4" />
                    {loadingId === contact.id ? "..." : "Check In"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
