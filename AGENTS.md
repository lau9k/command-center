# AGENTS.md — Command Center Dashboard

> **Purpose:** Persistent project context for AI coding agents (Cyrus, Claude Code).
> Every ticket automatically inherits these patterns. Follow them exactly.

---

## Tech Stack (Pinned Versions)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 14.x | App Router only. No Pages Router. |
| React | React | 18.x | Server Components by default |
| Language | TypeScript | 5.x | Strict mode. No `any`. |
| Database | Supabase (PostgreSQL) | @supabase/ssr | Use `createServerClient` for server, `createBrowserClient` for client |
| Styling | Tailwind CSS | 3.x | Use utility classes. No custom CSS files. |
| Charts | Recharts | 2.x | Dynamic import with `next/dynamic({ ssr: false })` |
| Validation | Zod | 3.x | All API routes + form inputs |
| Icons | Lucide React | latest | Consistent icon set |
| Deployment | Vercel | — | Auto-deploy from `main` branch |

---

## Project Structure

command-center/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard layout group
│   │   ├── page.tsx            # Home — KPI cards + task overview
│   │   ├── pipeline/           # Sales pipeline (Kanban)
│   │   ├── content/            # Content queue (Kanban)
│   │   ├── contacts/           # Contacts table + detail drawer
│   │   ├── tasks/              # Task list with priority engine
│   │   ├── community/          # Telegram community stats
│   │   ├── finance/            # Financial tracker (wallets, debts, forecasts)
│   │   └── layout.tsx          # Sidebar + header + theme provider
│   ├── api/                    # API route handlers
│   │   ├── contacts/           # CRUD endpoints
│   │   ├── tasks/              # CRUD endpoints
│   │   ├── content/            # CRUD endpoints
│   │   ├── pipeline/           # CRUD endpoints
│   │   ├── import/             # CSV import with column mapping
│   │   ├── seed/               # Demo data seeding
│   │   └── telegram/           # Bot command handler
│   └── globals.css             # Tailwind base + theme tokens
├── components/                 # Shared React components
│   ├── ui/                     # Primitives (Button, Card, Dialog, etc.)
│   ├── charts/                 # Recharts wrappers
│   ├── kpi-cards/              # Dashboard stat cards
│   └── layout/                 # Sidebar, Header, ThemeToggle
├── lib/                        # Utilities and clients
│   ├── supabase.ts             # Browser client (ANON KEY only)
│   ├── supabase-server.ts      # Server client (SERVICE ROLE KEY)
│   ├── design-tokens.ts        # Central design token definitions
│   └── utils.ts                # Shared helpers
├── packages/                   # Monorepo packages
│   └── mcp-supabase/           # MCP server for Claude integration
├── supabase/                   # Database
│   └── migrations/             # SQL migration files
├── public/                     # Static assets
└── AGENTS.md                   # ← This file

---

## Coding Standards

### Always Do
- Use **Server Components** by default. Only add `"use client"` when you need interactivity (onClick, useState, etc.)
- Use `export const dynamic = "force-dynamic"` on ALL pages that fetch Supabase data
- Validate ALL API route inputs with **Zod** schemas before touching the database
- Use TypeScript strict types. Define interfaces for all data shapes.
- Use **Tailwind utility classes** for styling. Follow existing patterns in the codebase.
- Handle loading states with **skeleton loaders** (not spinners)
- Handle empty states with helpful messages + call-to-action
- Use `try/catch` in all API routes and return structured `{ error: string }` responses
- Import Supabase clients from `lib/supabase.ts` (browser) or `lib/supabase-server.ts` (server)
- Reference design tokens from `lib/design-tokens.ts` for all colors, spacing, shadows

### Never Do
- Never use `any` type. Use `unknown` + type narrowing if truly unknown.
- Never use `var`. Use `const` by default, `let` only when reassignment is needed.
- Never import `SUPABASE_SERVICE_ROLE_KEY` in files under `app/` or `components/` (client-side code)
- Never use `console.log` in production code. Use structured error responses instead.
- Never create new Supabase clients inline — always use the singleton from `lib/`
- Never use Pages Router patterns (`getServerSideProps`, `getStaticProps`)
- Never add `"use client"` to a component that doesn't need browser APIs
- Never commit `.env` files or hardcode secrets

---

## Supabase Patterns

### Server-Side Data Fetching (API Routes)
```typescript
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
```

### Zod Validation Pattern
```typescript
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional(),
  company: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // Use parsed.data (typed + validated)
}
```

---

## Validation Commands

Run these before submitting ANY pull request:
```bash
npm run build          # Must pass — catches type errors + import issues
npx tsc --noEmit       # TypeScript check without emitting
npm run lint           # ESLint check
```

If `npm run build` fails, fix it before submitting the PR.

---

## Dashboard Domain

- **Production:** `command-center-neon-chi.vercel.app` (this is the REAL domain)
- **DO NOT USE:** `command-center.vercel.app` (wrong domain, causes 405 errors on webhooks)
- **Telegram webhook** must point to `-neon-chi` domain

---

## Database Tables (12 active)

contacts, content_posts, conversations, crypto_balances, debts, imports, pipeline_items, pipeline_stages, pipelines, projects, tasks, transactions

**Key column notes:**
- contacts uses `qualified_status` (NOT `status`)
- content_posts uses `scheduled_at` (NOT `scheduled_date`)
- pipeline_items uses `stage_id` (uuid FK, NOT `stage` text)
- `combined_transactions` is a VIEW, not a table

---

## Current Modules (12)

Home (KPIs), Pipeline (Kanban), Content Queue (Kanban), Contacts (Table + Drawer), Tasks (Priority Engine), Community (Telegram), Finance (Wallets/Debts/Forecasts/Treasury), Global Search (Cmd+K), CSV Import, Data Seeding, Theme Toggle, MCP Server
