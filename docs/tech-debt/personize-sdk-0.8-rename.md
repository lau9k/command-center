# Personize SDK 0.8 — Deprecated Method Rename Checklist

Tracking ticket: follow-up to BAS-443

As of SDK 0.8.0, the following methods are deprecated aliases.
They still work but should be renamed to canonical methods in a dedicated refactor PR.

## Direct SDK call sites

| # | File | Line | Deprecated call | Canonical replacement |
|---|------|------|-----------------|-----------------------|
| 1 | `app/api/contacts/[id]/gmail/route.ts` | 71 | `client.memory.smartRecall` | `client.memory.retrieve` |
| 2 | `app/api/personize/memorize/route.ts` | 29 | `client.memory.memorize` | `client.memory.save` |
| 3 | `app/api/personize/digest/route.ts` | 27 | `client.memory.smartRecall` | `client.memory.retrieve` |
| 4 | `app/api/personize/governance/route.ts` | 58 | `client.memory.smartRecall` | `client.memory.retrieve` |
| 5 | `app/api/personize/governance/route.ts` | 183 | `client.memory.memorize` | `client.memory.save` |
| 6 | `lib/personize/actions.ts` | 118 | `client.ai.smartGuidelines` | `client.context.retrieve({ types: ['guideline'] })` |
| 7 | `lib/personize/actions.ts` | 255 | `client.memory.memorize` | `client.memory.save` |

## Additional call sites (discovered via grep)

| # | File | Line | Deprecated call | Canonical replacement |
|---|------|------|-----------------|-----------------------|
| 8 | `app/api/personize/cache-memories/route.ts` | 99 | `client.memory.smartRecall` | `client.memory.retrieve` |
| 9 | `app/api/personize/sync-contacts/route.ts` | 135 | `client.memory.memorizeBatch` | `client.memory.saveBatch` |
| 10 | `app/api/personize/sync-contacts/route.ts` | 174 | `client.memory.memorizeBatch` | `client.memory.saveBatch` |
| 11 | `lib/personize/batch-memorize.ts` | 130 | `client.memory.memorizeBatch` | `client.memory.saveBatch` |
| 12 | `lib/memory-intake/processor.ts` | 83 | `client.memory.memorize` | `client.memory.save` |
| 13 | `scripts/personize-supabase-reconcile.ts` | 455 | `client.memory.memorize` | `client.memory.save` |
| 14 | `scripts/personize-supabase-reconcile.ts` | 516 | `client.memory.memorize` | `client.memory.save` |
| 15 | `scripts/reupload-missing-contacts.ts` | 277 | `client.memory.memorizeBatch` | `client.memory.saveBatch` |

## Wrapper functions (rename after SDK calls are updated)

These internal helpers wrap the deprecated SDK methods. Rename them once the underlying calls are updated:

- `lib/personize/actions.ts` — `memorize()` function (wraps `client.memory.memorize`)
- `lib/personize/actions.ts` — `smartRecall()` function (wraps `client.memory.smartRecall`)
- `lib/personize/batch-memorize.ts` — `batchMemorize()` function (wraps `client.memory.memorizeBatch`)

## Notes

- `@personize/cli` is **not installed** in this repo; no CLI bump needed.
- `smartRecallUnified` (used in `lib/personize/actions.ts`, `app/api/personize/recall/route.ts`, `app/api/contacts/batch-enrich/route.ts`) is cast via `as unknown` — check SDK 0.8.0 for a first-class replacement.
- Database column `memorized_at` and Supabase references to "memorize" are domain terms, not SDK methods — no rename needed.
