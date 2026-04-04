"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Tag,
  Brain,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { Contact } from "@/lib/types/database";
import type { ScoreBreakdown } from "@/lib/personize/relationship-score";
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
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilter } from "lucide-react";

const TAG_OPTIONS = ["Personize", "Hackathon", "MEEK", "Personal"] as const;

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface ContactsListData {
  contacts: Contact[];
  total: number;
  personizeAvailable: boolean;
}

interface ContactsKpis {
  totalContacts: number;
  taggedThisWeek: number;
  withMemories: number;
  untagged: number;
}

interface ScoredContactEntry {
  email: string | null;
  name: string;
  company: string | null;
  record_id: string;
  score: number;
  breakdown: ScoreBreakdown;
}

type ContactWithScore = Contact & {
  relationship_score?: number;
  score_breakdown?: ScoreBreakdown;
};

export function ContactsClient() {
  const queryClient = useQueryClient();

  const { data: contactsData } = useQuery<ContactsListData>({
    queryKey: ["contacts", "list"],
    queryFn: async () => {
      const res = await fetch("/api/contacts?page=1&pageSize=50");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const json = await res.json();
      return {
        contacts: (json.data as Contact[]) ?? [],
        total: json.pagination?.total ?? json.data?.length ?? 0,
        personizeAvailable: false,
      };
    },
    staleTime: 30_000,
  });

  const { data: kpis } = useQuery<ContactsKpis>({
    queryKey: ["contacts", "kpis"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/contacts/enrichment-stats");
        if (!res.ok) throw new Error("Failed to fetch enrichment stats");
        const json = await res.json();
        const k = json.kpis as {
          totalContacts: number;
          withMemories: number;
          withProperties: number;
          lastUpdated: string;
        };
        return {
          totalContacts: k.totalContacts,
          withMemories: k.withMemories,
          taggedThisWeek: k.withProperties,
          untagged: k.totalContacts - k.withProperties,
        };
      } catch {
        return { totalContacts: 0, taggedThisWeek: 0, withMemories: 0, untagged: 0 };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch relationship scores
  const { data: scoresData } = useQuery<{ contacts: ScoredContactEntry[] }>({
    queryKey: ["contacts", "scores"],
    queryFn: async () => {
      const res = await fetch("/api/contacts/scores");
      if (!res.ok) return { contacts: [] };
      return res.json();
    },
    staleTime: 120_000, // 2 minutes
  });

  const initialContacts = contactsData?.contacts ?? [];
  const kpiValues: ContactsKpis = kpis ?? {
    totalContacts: 0,
    taggedThisWeek: 0,
    withMemories: 0,
    untagged: 0,
  };

  // Build a lookup map from scores data (keyed by record_id and email)
  const scoresMap = useMemo(() => {
    const map = new Map<string, ScoredContactEntry>();
    for (const entry of scoresData?.contacts ?? []) {
      if (entry.record_id) map.set(entry.record_id, entry);
      if (entry.email) map.set(entry.email, entry);
    }
    return map;
  }, [scoresData]);

  // Local overrides
  const [localContacts, setLocalContacts] = useState<Contact[] | null>(null);
  const contacts = localContacts ?? initialContacts;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scoreSortDirection, setScoreSortDirection] = useState<"asc" | "desc" | null>(null);

  // Form drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Merge scores into contacts
  const contactsWithScores: ContactWithScore[] = useMemo(() => {
    return contacts.map((c) => {
      const scoreEntry =
        (c.record_id ? scoresMap.get(c.record_id) : undefined) ??
        (c.email ? scoresMap.get(c.email) : undefined);
      if (scoreEntry) {
        return {
          ...c,
          relationship_score: scoreEntry.score,
          score_breakdown: scoreEntry.breakdown,
        };
      }
      return c;
    });
  }, [contacts, scoresMap]);

  const filteredContacts = useMemo(() => {
    // If we're using server-side search, return all contacts as-is
    let result: ContactWithScore[] =
      isSemanticSearch || pagination
        ? contactsWithScores
        : contactsWithScores;

    if (!isSemanticSearch && !pagination) {
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
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.job_title && c.job_title.toLowerCase().includes(q))
        );
      }
    }

    // Apply score sort if active
    if (scoreSortDirection) {
      result = [...result].sort((a, b) => {
        const sa = a.relationship_score ?? a.priority_score ?? a.score ?? 0;
        const sb = b.relationship_score ?? b.priority_score ?? b.score ?? 0;
        return scoreSortDirection === "desc" ? sb - sa : sa - sb;
      });
    }

    return result;
  }, [contactsWithScores, tagFilter, search, isSemanticSearch, pagination, scoreSortDirection]);

  const handleSortByScore = useCallback(() => {
    setScoreSortDirection((prev) => {
      if (prev === null) return "desc";
      if (prev === "desc") return "asc";
      return null;
    });
  }, []);

  const fetchContacts = useCallback(async (page = 1, tag?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "50");
      if (tag && tag !== "all") params.set("tag", tag);

      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLocalContacts(json.data ?? []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
        setCurrentPage(page);
      }
    } catch {
      // silent refresh failure
    }
  }, []);

  const handleSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSemanticSearch(false);
      fetchContacts(1, tagFilter);
      return;
    }

    setIsSearching(true);
    setIsSemanticSearch(true);

    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const json = await res.json();
        setLocalContacts(json.data ?? []);
        setPagination(null);
      } else if (res.status === 503) {
        setIsSemanticSearch(false);
      }
    } catch {
      setIsSemanticSearch(false);
    } finally {
      setIsSearching(false);
    }
  }, [fetchContacts, tagFilter]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length >= 3) {
        searchTimeoutRef.current = setTimeout(() => {
          handleSemanticSearch(value);
        }, 500);
      } else if (!value.trim()) {
        setIsSemanticSearch(false);
        fetchContacts(1, tagFilter);
      }
    },
    [handleSemanticSearch, fetchContacts, tagFilter]
  );

  const refreshContacts = useCallback(async () => {
    await fetchContacts(currentPage, tagFilter);
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
  }, [fetchContacts, currentPage, tagFilter, queryClient]);

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
        toast.error("Failed to save \u2014 try again");
      }
    },
    [contacts, refreshContacts]
  );

  const handleContactUpdated = useCallback(
    (updated: Contact) => {
      setLocalContacts((prev) =>
        (prev ?? initialContacts).map((c) => (c.id === updated.id ? updated : c))
      );
      setSelectedContact(updated);
    },
    []
  );

  const handleContactDeleted = useCallback(
    (id: string) => {
      setLocalContacts((prev) =>
        (prev ?? initialContacts).filter((c) => c.id !== id)
      );
      setSelectedContact(null);
    },
    []
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchContacts(newPage, tagFilter);
    },
    [fetchContacts, tagFilter]
  );

  const handleTagFilterChange = useCallback(
    (value: string) => {
      setTagFilter(value);
      if (!isSemanticSearch) {
        fetchContacts(1, value);
      }
    },
    [fetchContacts, isSemanticSearch]
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
        <SharedEmptyState
          icon={<Users className="size-12" />}
          title="No contacts imported"
          description="Import your LinkedIn connections to start building relationships."
          action={{ label: "Import CSV", href: "/import?module=contacts" }}
        />
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
          value={pagination?.total ?? kpiValues.totalContacts}
          subtitle="in network"
          icon={<Users className="size-5" />}
        />
        <KpiCard
          label="Tagged This Week"
          value={kpiValues.taggedThisWeek}
          subtitle="recently tagged"
          icon={<Tag className="size-5" />}
        />
        <KpiCard
          label="With Memories"
          value={kpiValues.withMemories}
          subtitle="have conversation history"
          icon={<Brain className="size-5" />}
        />
        <KpiCard
          label="Untagged"
          value={kpiValues.untagged}
          subtitle="need categorization"
          icon={<UserX className="size-5" />}
        />
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          {isSearching ? (
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500 animate-pulse" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="Search contacts (AI-powered with 3+ characters)..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
          {isSemanticSearch && !isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-500 font-medium">
              AI Search
            </span>
          )}
        </div>
        <Select value={tagFilter} onValueChange={handleTagFilterChange}>
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
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<ListFilter />}
          title="No results match your filters"
          description="Try adjusting your search or filter criteria."
          actionLabel="Clear filters"
          onAction={() => { setSearch(""); setTagFilter("all"); }}
        />
      ) : (
        <ContactsTable
          contacts={filteredContacts}
          onSelectContact={setSelectedContact}
          onSortByScore={handleSortByScore}
          scoreSortDirection={scoreSortDirection}
        />
      )}

      {/* Pagination Controls */}
      {pagination && !isSemanticSearch && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * (pagination.pageSize)) + 1}&ndash;
            {Math.min(currentPage * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} contacts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

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
