import type { Contact } from "@/lib/types/database";

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ContactsListData {
  contacts: Contact[];
  total: number;
  personizeAvailable: boolean;
  pagination?: Pagination;
}

/**
 * Shared query-options factory for contacts list.
 * Import on both server (prefetchQuery) and client (useQuery)
 * to guarantee key + staleTime alignment and avoid double-fetches.
 */
export const contactListOptions = (
  page = 1,
  pageSize = 50,
  tag = "",
) => ({
  queryKey: ["contacts", "list", pageSize] as const,
  queryFn: async (): Promise<ContactsListData> => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (tag) params.set("tag", tag);
    const res = await fetch(`/api/contacts?${params}`);
    if (!res.ok) throw new Error("Failed to fetch contacts");
    const json = await res.json();
    const pag = json.pagination as Pagination | undefined;
    return {
      contacts: (json.data as Contact[]) ?? [],
      total: pag?.total ?? json.data?.length ?? 0,
      personizeAvailable: false,
      pagination: pag
        ? { page: pag.page, pageSize: pag.pageSize, total: pag.total, hasMore: pag.hasMore }
        : undefined,
    };
  },
  staleTime: 30_000,
});
