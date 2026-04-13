# Architecture Decisions

## 2026-04-13 — Standardize Personize entity type casing to lowercase

**Status:** Approved  
**Ticket:** BAS-438

### Context

Personize memory schema has 5 collections. Three collections (Shared Workspace, Standard Profile, Agent Memory) use lowercase entity types (`"contact"`, `"content"`), but Contact Properties uses `"Contact"` and Company Properties uses `"Company"`. This inconsistency could cause silent filtering misses when code queries by entity type.

### Decision

All collections must use **lowercase** entity types (`"contact"`, `"company"`). This aligns with:
- Existing codebase conventions (all `entityType` references in sync code use lowercase)
- The majority of collections already using lowercase
- Reduced risk of case-sensitive filter bugs

### Action Taken

- Updated Contact Properties: `entityType "Contact" → "contact"`
- Updated Company Properties: `entityType "Company" → "company"`
- Created `scripts/personize-schema-audit.ts` for ongoing visibility
- No downstream code changes needed — all code already uses lowercase

### Company Properties Collection Status

The Company Properties collection (`855353ac-4919-4b8e-89f5-f985f45d6ca1`) was audited for activity. If no writes were found in the last 30 days, the collection is a candidate for retirement. The audit script can be used to check current status:

```bash
npx tsx scripts/personize-schema-audit.ts
```
