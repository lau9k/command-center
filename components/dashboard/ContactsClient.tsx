"use client";

import { useState, useMemo } from "react";
import type { Contact } from "@/lib/types/database";
import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { ContactDetailDrawer } from "@/components/dashboard/ContactDetailDrawer";
import { KpiCard } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Tag, Brain, UserX, Search } from "lucide-react";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";

const TAG_OPTIONS = ["Personize", "Hackathon", "MEEK", "Personal"] as const;

interface ContactsClientProps {
  initialContacts: Contact[];
  kpis: {
    totalContacts: number;
    taggedThisWeek: number;
    withMemories: number;
    untagged: number;
  };
}

export function ContactsClient({ initialContacts, kpis }: ContactsClientProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const filteredContacts = useMemo(() => {
    let result = initialContacts;

    if (tagFilter && tagFilter !== "all") {
      result = result.filter(
        (c) => c.tags && c.tags.includes(tagFilter)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [initialContacts, tagFilter, search]);

  if (initialContacts.length === 0) {
    return <ModuleEmptyState module="contacts" />;
  }

  return (
    <>
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total Contacts"
          value={kpis.totalContacts}
          subtitle="in database"
          icon={<Users className="size-5" />}
        />
        <KpiCard
          label="Tagged This Week"
          value={kpis.taggedThisWeek}
          subtitle="recently tagged"
          icon={<Tag className="size-5" />}
        />
        <KpiCard
          label="With Memories"
          value={kpis.withMemories}
          subtitle="have email for recall"
          icon={<Brain className="size-5" />}
        />
        <KpiCard
          label="Untagged"
          value={kpis.untagged}
          subtitle="need categorization"
          icon={<UserX className="size-5" />}
        />
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {TAG_OPTIONS.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Table */}
      <ContactsTable
        contacts={filteredContacts}
        onSelectContact={setSelectedContact}
      />

      {/* Contact Detail Drawer */}
      <ContactDetailDrawer
        contact={selectedContact}
        open={selectedContact !== null}
        onClose={() => setSelectedContact(null)}
      />
    </>
  );
}
