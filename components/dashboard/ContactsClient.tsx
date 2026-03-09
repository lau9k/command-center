"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Users, Tag, Brain, UserX, Search } from "lucide-react";
import type { Contact } from "@/lib/types/database";
import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { ContactDetailPanel } from "@/components/contacts/ContactDetailPanel";
import { ContactForm } from "@/components/dashboard/ContactForm";
import type { ContactFormData } from "@/components/dashboard/ContactForm";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Form drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);




  const filteredContacts = useMemo(() => {
    let result = contacts;

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
  }, [contacts, tagFilter, search]);

  const refreshContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const json = await res.json();
        setContacts(json.data ?? []);
      }
    } catch {
      // silent refresh failure
    }
  }, []);

  const handleCreateOrEdit = useCallback(
    async (data: ContactFormData, contactId?: string) => {
      try {
        if (contactId) {
          const res = await fetch(`/api/contacts/${contactId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              email: data.email || null,
              company: data.company || null,
              source: data.source,
              status: data.status,
              tags: data.tags,
            }),
          });
          if (!res.ok) throw new Error("Failed to update contact");
          toast.success("Contact updated");
        } else {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              email: data.email || null,
              company: data.company || null,
              source: data.source,
              status: data.status,
              tags: data.tags,
              project_id: contacts[0]?.project_id ?? "00000000-0000-0000-0000-000000000000",
            }),
          });
          if (!res.ok) throw new Error("Failed to create contact");
          toast.success("Contact created");
        }
        await refreshContacts();
        setSelectedContact(null);
      } catch {
        toast.error("Failed to save — try again");
      }
    },
    [contacts, refreshContacts]
  );

  const handleContactUpdated = useCallback(
    (updated: Contact) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSelectedContact(updated);
    },
    []
  );

  const handleContactDeleted = useCallback(
    (id: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedContact(null);
    },
    []
  );

  function openNewForm() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function openEditForm(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
    setSelectedContact(null);
  }

  if (contacts.length === 0 && initialContacts.length === 0) {
    return (
      <>
        <div className="flex justify-end">
          <Button onClick={openNewForm} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            New Contact
          </Button>
        </div>
        <ModuleEmptyState module="contacts" />
        <ContactForm
          open={formOpen}
          onOpenChange={setFormOpen}
          contact={editingContact}
          onSubmit={handleCreateOrEdit}
        />
      </>
    );
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
        <Button onClick={openNewForm} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          New Contact
        </Button>
      </div>

      {/* Contacts Table */}
      <ContactsTable
        contacts={filteredContacts}
        onSelectContact={setSelectedContact}
      />

      {/* Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        open={selectedContact !== null}
        onClose={() => setSelectedContact(null)}
        onEdit={openEditForm}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
      />

      {/* Contact Form Drawer */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSubmit={handleCreateOrEdit}
      />
    </>
  );
}
