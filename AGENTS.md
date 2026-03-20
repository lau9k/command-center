# AGENTS.md — Command Center Dashboard

> **Purpose:** Persistent project context for AI coding agents (Conductor, Cyrus, Claude Code).
> Every ticket automatically inherits these patterns. Follow them exactly.
> **Last Updated:** 2026-03-20

---

## Tech Stack (Pinned Versions — match package.json exactly)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.1.6 | App Router ONLY. No Pages Router. |
| React | React | 19.2.3 | Server Components by default |
| React DOM | react-dom | 19.2.3 | |
| Language | TypeScript | 5.9.3 | Strict mode. No `any`. |
| Database | Supabase | @supabase/ssr 0.9.0 | NOT @supabase/auth-helpers-nextjs (removed) |
| Supabase JS | @supabase/supabase-js | 2.98.0 | |
| Styling | Tailwind CSS | 4.2.1 | v4 syntax — NOT v3 |
| Charts | Recharts | 3.8.0 | Dynamic import with `next/dynamic({ ssr: false })` |
| Data Fetching | @tanstack/react-query | 5.90.21 | Client-side data fetching |
| Virtual Scroll | @tanstack/react-virtual | 3.13.22 | Long list performance |
| Validation | Zod | 4.3.6 | All API routes + form inputs |
| Icons | lucide-react | 0.577.0 | Consistent icon set |
| Toasts | sonner | 2.0.7 | Toast notifications |
| Command Palette | cmdk | 1.1.1 | Cmd+K |
| Drag & Drop | @hello-pangea/dnd | 18.0.1 | Kanban boards |
| AI | @anthropic-ai/sdk | 0.78.0 | AI features |
| Memory | @personize/sdk | 0.5.2 | Memory + governance |
| Error Tracking | @sentry/nextjs | 10.42.0 | Error monitoring |
| Deployment | Vercel | — | Auto-deploy from `main` branch |

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 3. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 4. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### 5. Self-Improvement Loop
- After ANY correction: note the pattern to prevent the same mistake
- Ruthlessly iterate until mistake rate drops
- Review lessons at session start for relevant project

### 6. Core Principles
- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project Structure

```
command-center/
├── app/                           # Next.js App Router
│   ├── (dashboard)/               # Dashboard layout group
│   │   ├── page.tsx               # Home — KPIs + widgets
│   │   ├── contacts/              # Contact management
│   │   ├── tasks/                 # Task views (list, board, outreach, recurring)
│   │   ├── content/               # Content management (calendar, board)
│   │   ├── finance/               # Finance module
│   │   │   ├── debts/             # Debt tracking + payoff projections
│   │   │   ├── reimbursements/    # Reimbursement requests + payments
│   │   │   ├── treasury/          # Crypto portfolio
│   │   │   └── forecast/          # Cash flow forecasting
│   │   ├── pipeline/              # CRM pipeline (Kanban)
│   │   ├── meetings/              # Meeting records + Granola sync
│   │   ├── analytics/             # Cross-module analytics
│   │   ├── notifications/         # Notification center
│   │   ├── projects/              # Project management (nested routes)
│   │   ├── conversations/         # Conversation history
│   │   ├── admin/                 # Admin tools (seed, health)
│   │   ├── settings/              # User settings
│   │   └── layout.tsx             # Sidebar + header + theme provider
│   ├── api/                       # 95+ API route handlers
│   │   ├── tasks/                 # Task CRUD
│   │   ├── contacts/              # Contact CRUD + [id] routes
│   │   ├── content/               # Content CRUD
│   │   ├── finance/               # transactions, debts, crypto, reimbursements, forecast
│   │   ├── pipeline/              # Pipeline CRUD
│   │   ├── personize/             # Memory + governance endpoints
│   │   ├── plaid/                 # Bank sync (link, exchange, accounts, sync)
│   │   ├── admin/                 # Seed, health checks
│   │   ├── outreach-stats/        # Outreach funnel metrics
│   │   └── [20+ other routes]     # notifications, projects, meetings, etc.
│   └── globals.css                # Tailwind base + theme tokens
├── components/                    # React components by domain
│   ├── dashboard/    (36)         # Shared dashboard (KPIStrip, TaskCard, drawers)
│   ├── layout/       (6)         # Sidebar, Header, MobileHeader
│   ├── ui/           (33)        # shadcn/ui primitives
│   ├── contacts/     (17)        # Contact-specific
│   ├── content/      (13)        # Content management
│   ├── finance/      (20)        # Finance dashboards + charts
│   ├── tasks/        (13)        # Task views + board
│   ├── pipeline/     (9)         # Pipeline board
│   ├── home/         (10)        # Home dashboard widgets
│   ├── settings/     (15)        # Settings panels
│   ├── sponsors/     (9)         # Sponsor management
│   └── shared/       (13)        # FilterBar, PageHeader, etc.
├── lib/                           # Utilities and clients
│   ├── supabase/                  # client.ts, server.ts, service.ts, middleware.ts
│   ├── types/                     # database.ts (715 lines, 45 tables), project.ts
│   ├── personize/                 # client.ts, actions.ts, batch-memorize.ts
│   ├── auth/                      # getSession.ts
│   ├── ingest/                    # n8n-adapters.ts
│   ├── validations.ts             # Zod schemas
│   ├── api-error-handler.ts       # withErrorHandler wrapper
│   └── [40+ utility files]
├── middleware.ts                   # Auth enforcement on all routes
└── AGENTS.md                      # ← This file
```

---

## Coding Standards

### Import Rules — Supabase Client Selection

Three clients exist for different contexts. Using the wrong one causes auth failures or data leaks.

| Context | Import | Function |
|---------|--------|----------|
| **Client Component** | `import { createClient } from "@/lib/supabase/client"` | Browser-side, anon key, singleton |
| **Server Component** | `import { createClient } from "@/lib/supabase/server"` | Cookie-based auth, `await createClient()` |
| **API Route / Server Action** | `import { createServiceClient } from "@/lib/supabase/service"` | Full permissions, `"server-only"` guard |

### Always Do
- Use **Server Components** by default. Only add `"use client"` when you need interactivity
- Use `export const dynamic = "force-dynamic"` on pages that fetch Supabase data
- Validate ALL API route inputs with **Zod** schemas from `@/lib/validations`
- Wrap ALL API route handlers with `withErrorHandler()` from `@/lib/api-error-handler`
- Use TypeScript strict types. No `any`. Use `unknown` + type narrowing if truly unknown.
- Use **Tailwind v4 utility classes** for styling. Follow existing patterns.
- Handle loading states with **skeleton loaders** (not spinners)
- Handle empty states with helpful messages + call-to-action
- Use `lucide-react` for icons, `sonner` for toasts
- Import Supabase clients from `lib/supabase/` (see table above)

### Never Do
- Never use `@supabase/auth-helpers-nextjs` (deprecated, removed from project)
- Never use `any` type
- Never use `var`. Use `const` by default, `let` only when reassignment needed
- Never import `SUPABASE_SERVICE_ROLE_KEY` in client components
- Never use `console.log` in production code
- Never create new Supabase clients inline — use singletons from `lib/supabase/`
- Never use Pages Router patterns (`getServerSideProps`, `getStaticProps`)
- Never add `"use client"` to a component that doesn't need browser APIs
- Never commit `.env` files or hardcode secrets
- Never modify files outside your ticket scope

---

## API Route Pattern (Canonical)

Every API route uses this exact structure. Copy it, don't invent new patterns.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const { data, error } = await supabase
    .from("table")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  // Validate with Zod → insert → return 201
});
```

---

## Canonical Pattern Files

When building something new, copy from these real files — don't invent patterns.

| Pattern | Example File | Use For |
|---------|-------------|---------|
| API route (CRUD) | `app/api/tasks/route.ts` | New API endpoints |
| API route (nested) | `app/api/contacts/[id]/route.ts` | Dynamic route params |
| Dashboard page | `app/(dashboard)/contacts/page.tsx` | New dashboard pages |
| Client component | `components/contacts/ContactsClient.tsx` | Data-heavy client components |
| Board view | `components/tasks/task-board.tsx` | Kanban-style boards |
| Form dialog | `components/dashboard/TaskFormDialog.tsx` | Modal forms |
| Empty state | `components/dashboard/ModuleEmptyState.tsx` | No-data states |
| Data table | `components/ui/data-table.tsx` | Sortable/filterable tables |
| KPI widget | `components/home/KPIStripLive.tsx` | Dashboard metrics |
| Drawer detail | `components/dashboard/ContactDetailDrawer.tsx` | Side panel details |
| Finance chart | `components/finance/ForecastCharts.tsx` | Recharts with theming |

---

## Validation Commands

Run these before submitting ANY pull request:
```bash
npm run build          # Must pass — catches type errors + import issues
npx tsc --noEmit       # TypeScript check without emitting
```

If `npm run build` fails, fix it before submitting the PR. No exceptions.

---

## Task Management

1. **Plan First:** Write plan with checkable items before starting implementation
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section when done

---

## Dashboard Domain

- **Production:** `command-center-neon-chi.vercel.app` (this is the REAL domain)
- **DO NOT USE:** `command-center.vercel.app` (wrong domain, causes 405 errors)

---

## Database Tables (45 active)

### Core
`contacts`, `tasks`, `projects`, `notifications`, `pipeline_items`, `pipeline_stages`, `pipelines`, `content_posts`, `content_items`, `meetings`, `meeting_actions`, `activity_log`, `memory_stats`

### Finance
`transactions`, `debts`, `balance_snapshots`, `reimbursement_requests`, `reimbursement_items`, `reimbursement_payments`, `reimbursement_payment_allocations`, `cash_forecasts`, `forecast_runs`, `scheduled_flows`, `crypto_balances`, `wallet_pnl_monthly`, `invoices`

### Integration
`gmail_accounts`, `plaid_accounts`, `plaid_items`, `github_stats`, `sync_log`, `webhook_events`, `imports`

### Other
`profiles`, `user_preferences`, `saved_views`, `email_templates`, `resources`, `sponsors`, `sponsor_outreach`, `events`, `conversations`, `community_events`, `community_stats`

**Key column notes:**
- contacts uses `qualified_status` (NOT `status`)
- content_posts uses `scheduled_at` (NOT `scheduled_date`)
- pipeline_items uses `stage_id` (uuid FK, NOT `stage` text)
- `combined_transactions` is a VIEW, not a table
- tasks has `task_type` and `outreach_status` columns for outreach tracking

---

## Middleware

Root `middleware.ts` calls `updateSession()` from `lib/supabase/middleware.ts`. Enforces auth on all routes except `/login`, `/callback`, `/auth/*`. Redirects unauthenticated users to `/login?redirectTo=<path>`.

---

## Current Modules (15+)

Home (KPIs + widgets), Tasks (list + board + outreach + recurring), Contacts (table + drawer + dedup), Content (calendar + board), Finance (transactions + debts + reimbursements + treasury + forecast), Pipeline (Kanban + analytics), Meetings (Granola sync), Analytics (charts + trends), Notifications (inbox + drawer + bell), Projects (nested routes + templates), Conversations (thread drawer), Admin (seed + health), Settings (prefs + API keys + integrations), Global Search (Cmd+K)
