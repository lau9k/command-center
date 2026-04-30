"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Loader2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ContactDetailDrawer } from "@/components/dashboard/ContactDetailDrawer";
import type { Contact } from "@/lib/types/database";

interface Props {
  contactIds: string[];
  onUpdate: (newContactIds: string[]) => Promise<void>;
}

interface ContactsResponse {
  data?: Contact[];
}

export function DealPrimaryContacts({ contactIds, onUpdate }: Props) {
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const [adderOpen, setAdderOpen] = useState(false);

  // Fetch chip data
  const { data: chipsData, isLoading } = useQuery({
    queryKey: ["deal-primary-contacts", contactIds.slice().sort().join(",")],
    queryFn: async (): Promise<Contact[]> => {
      if (contactIds.length === 0) return [];
      const params = new URLSearchParams({ ids: contactIds.join(",") });
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) return [];
      const json = (await res.json()) as ContactsResponse;
      const all = json.data ?? [];
      // Order to match contactIds
      const map = new Map(all.map((c) => [c.id, c]));
      return contactIds
        .map((id) => map.get(id))
        .filter((c): c is Contact => c !== undefined);
    },
    staleTime: 30_000,
  });

  const chips = chipsData ?? [];

  async function handleRemove(id: string) {
    await onUpdate(contactIds.filter((cid) => cid !== id));
  }

  async function handleAdd(contact: Contact) {
    if (contactIds.includes(contact.id)) return;
    await onUpdate([...contactIds, contact.id]);
    setAdderOpen(false);
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Primary Contacts
      </h4>
      <div className="flex flex-wrap items-center gap-2">
        {isLoading && contactIds.length > 0 ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          chips.map((c) => (
            <ContactChip
              key={c.id}
              contact={c}
              onClick={() => setOpenContact(c)}
              onRemove={() => handleRemove(c.id)}
            />
          ))
        )}
        <Popover open={adderOpen} onOpenChange={setAdderOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
              <Plus className="size-3.5" />
              Link contact
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <ContactSearch onSelect={handleAdd} excludeIds={contactIds} />
          </PopoverContent>
        </Popover>
      </div>
      {openContact && (
        <ContactDetailDrawer
          contact={openContact}
          open={!!openContact}
          onClose={() => setOpenContact(null)}
        />
      )}
    </div>
  );
}

function ContactChip({
  contact,
  onClick,
  onRemove,
}: {
  contact: Contact;
  onClick: () => void;
  onRemove: () => void;
}) {
  const initials = contact.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="group inline-flex items-center gap-2 rounded-full border border-border bg-card pr-1 pl-2 py-1 transition-colors hover:bg-accent/50">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 text-left"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initials || "?"}
        </span>
        <span className="text-xs font-medium text-foreground">{contact.name}</span>
        {contact.job_title && (
          <span className="text-xs text-muted-foreground">· {contact.job_title}</span>
        )}
        {contact.company && (
          <span className="text-xs text-muted-foreground">· {contact.company}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${contact.name}`}
        className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function ContactSearch({
  onSelect,
  excludeIds,
}: {
  onSelect: (c: Contact) => void;
  excludeIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    tRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, pageSize: "10" });
        const res = await fetch(`/api/contacts?${params}`);
        if (res.ok) {
          const json = (await res.json()) as ContactsResponse;
          const all = json.data ?? [];
          setResults(all.filter((c) => !excludeIds.includes(c.id)));
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [query, excludeIds]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {results.length === 0 && query.trim().length >= 2 && !loading && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches</p>
        )}
        {results.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <div className="font-medium">{c.name}</div>
            {(c.job_title || c.company) && (
              <div className="text-xs text-muted-foreground">
                {[c.job_title, c.company].filter(Boolean).join(" · ")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
