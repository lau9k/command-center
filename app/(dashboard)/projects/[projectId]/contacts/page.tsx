"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Contact, ContactStatus, ContactSource } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ContactDetail from "@/components/contacts/ContactDetail";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

const statusColors: Record<ContactStatus, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  inactive: "outline",
  lead: "secondary",
  customer: "default",
};

const sourceLabels: Record<ContactSource, string> = {
  manual: "Manual",
  referral: "Referral",
  website: "Website",
  linkedin: "LinkedIn",
  other: "Other",
};

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;

type ContactFormData = {
  name: string;
  email: string;
  company: string;
  source: ContactSource;
  status: ContactStatus;
};

const emptyForm: ContactFormData = {
  name: "",
  email: "",
  company: "",
  source: "manual",
  status: "active",
};

export default function ProjectContactsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(ALL_VALUE);
  const [filterSource, setFilterSource] = useState<string>(ALL_VALUE);
  const [page, setPage] = useState(1);

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<Contact[]>();
    setContacts(data ?? []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-contacts-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contacts",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchContacts();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContacts, projectId, supabase]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterSource]);

  const filtered = useMemo(() => {
    let result = contacts;

    if (filterStatus !== ALL_VALUE) {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (filterSource !== ALL_VALUE) {
      result = result.filter((c) => c.source === filterSource);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.tags && c.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [contacts, filterStatus, filterSource, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = filterStatus !== ALL_VALUE || filterSource !== ALL_VALUE || search.trim() !== "";

  function openCreate() {
    setEditingContact(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      email: contact.email ?? "",
      company: contact.company ?? "",
      source: contact.source,
      status: contact.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      company: form.company.trim() || null,
      source: form.source,
      status: form.status,
      project_id: projectId,
    };

    if (editingContact) {
      const { error } = await supabase.from("contacts").update(payload).eq("id", editingContact.id);
      if (error) {
        toast.error("Failed to update contact");
      } else {
        toast.success("Contact updated");
      }
    } else {
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) {
        toast.error("Failed to create contact");
      } else {
        toast.success("Contact created");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchContacts();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success("Contact deleted");
    }
    fetchContacts();
  }

  if (loading) {
    return <ContactsLoadingSkeleton />;
  }

  if (selectedContact) {
    return (
      <ContactDetail
        contact={selectedContact}
        onBack={() => setSelectedContact(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} in this project
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, company, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterStatus(ALL_VALUE);
              setFilterSource(ALL_VALUE);
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Contacts table */}
      {filtered.length === 0 && contacts.length === 0 && !hasFilters ? (
        <EmptyState
          icon={<Users />}
          title="No contacts yet"
          description="Add your first contact to get started."
          action={{ label: "Add Contact", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No contacts match filters"
          description="Try adjusting your search or filters."
        />
      ) : (
        <>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email ?? "—"}</TableCell>
                    <TableCell>{contact.company ?? "—"}</TableCell>
                    <TableCell>{sourceLabels[contact.source]}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[contact.status]}>
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(contact)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} contacts
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) =>
                    setForm({ ...form, source: v as ContactSource })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as ContactStatus })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editingContact ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>
      <div className="rounded-md border border-border">
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
