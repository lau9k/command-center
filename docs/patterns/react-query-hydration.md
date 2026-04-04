# React Query Hydration — Best Practices

> Source: Perplexity infrastructure audit, April 4 2026. Validated against production bugs.

## Anti-Patterns to Avoid

### 1. Mismatched query keys between server and client (causes double-fetch)

**Bad:**
```typescript
// page.tsx (server)
await queryClient.prefetchQuery({
  queryKey: ["contacts", "list"],
  queryFn: () => fetchContacts(),
});

// ContactsClient.tsx (client)
useQuery({
  queryKey: ["contacts", "list", { page, tag }],  // different key!
  queryFn: () => fetch(`/api/contacts?page=${page}&tag=${tag}`),
});
```

**Good:** Use one shared query-options factory:
```typescript
// lib/queries/contacts.ts
export const contactListOptions = (page = 1, tag = "") => ({
  queryKey: ["contacts", "list", { page, tag }],
  queryFn: () => fetch(`/api/contacts?page=${page}&tag=${tag}`).then(r => r.json()),
  staleTime: 30_000,
});

// page.tsx — import and use
await queryClient.prefetchQuery(contactListOptions());

// ContactsClient.tsx — same import
const { data } = useQuery(contactListOptions(page, tag));
```

### 2. Mismatched response shapes (causes immediate refetch)

If server prefetch returns `{ contacts, total }` but client expects `{ contacts, total, pagination }`, React Query treats cached data as stale.

**Fix:** Always return the exact same TypeScript shape from both paths, including optional fields with defaults.

### 3. Missing staleTime (negates SSR win)

Without `staleTime`, React Query considers hydrated data stale at mount and refetches immediately.

**Minimum:** `staleTime: 30_000` (30s) for listing pages.

### 4. Dual-caching the same entity

Never cache the same data in both Next.js `fetch()` cache and React Query with different invalidation timing. Pick one owner per data domain:
- **Server-owned:** Fetched in Server Component, streamed to client, no React Query
- **React Query-owned:** Prefetched via `prefetchQuery`, hydrated, managed client-side

### 5. Session-dependent values in keys

Route transitions can create confusing cache reuse if keys aren't unique. Include user/filter/page state in the query key.

## Caching Architecture

See `lib/cache/redis.ts` for the two-tier cache (L1 in-memory + L2 Upstash Redis).

Use `cached()` for expensive external API calls. Do NOT use for Supabase queries (they should stay fresh).
