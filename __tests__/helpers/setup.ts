import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ── Mock "server-only" import used by service client ────────────
vi.mock("server-only", () => ({}));

// ── Mock Sentry ─────────────────────────────────────────────────
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// ── Mock Personize ──────────────────────────────────────────────
vi.mock("@/lib/personize/actions", () => ({
  searchContacts: vi.fn(),
}));

// ── Mock activity logger ────────────────────────────────────────
vi.mock("@/lib/activity-logger", () => ({
  logActivity: vi.fn(),
}));

// ── Mock task scoring ───────────────────────────────────────────
vi.mock("@/lib/task-scoring", () => ({
  scoreTask: vi.fn((task: Record<string, unknown>) => ({
    score: typeof task.priority === "string" && task.priority === "critical" ? 100 : 50,
    factors: { priority: 50, due_date: 0, staleness: 0 },
  })),
}));

// ── Supabase mock builder ───────────────────────────────────────

type MockData = Record<string, unknown>[] | Record<string, unknown> | null;

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  // result state
  _data: MockData;
  _error: { message: string } | null;
}

function createMockQueryBuilder(
  data: MockData = [],
  error: { message: string } | null = null
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    _data: data,
    _error: error,
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    ilike: vi.fn(),
    contains: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  };

  const chainMethods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "or", "ilike", "contains", "order",
  ] as const;

  for (const method of chainMethods) {
    builder[method].mockReturnValue(builder);
  }

  // single() returns the result with first element
  builder.single.mockImplementation(() => {
    const d = Array.isArray(builder._data) ? builder._data[0] ?? null : builder._data;
    return Promise.resolve({ data: d, error: builder._error });
  });

  // Make builder thenable so `await query` resolves
  Object.defineProperty(builder, "then", {
    value(
      resolve: (val: { data: MockData; error: { message: string } | null }) => void,
      reject?: (err: unknown) => void
    ) {
      try {
        resolve({ data: builder._data, error: builder._error });
      } catch (e) {
        if (reject) reject(e);
      }
    },
    enumerable: false,
  });

  return builder;
}

// Map from table name to mock query builder
const tableBuilders = new Map<string, MockQueryBuilder>();

function getMockBuilder(table: string): MockQueryBuilder {
  if (!tableBuilders.has(table)) {
    tableBuilders.set(table, createMockQueryBuilder());
  }
  return tableBuilders.get(table)!;
}

const mockSupabase = {
  from: vi.fn((table: string) => getMockBuilder(table)),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "test-user-id",
          email: "test@example.com",
          aud: "authenticated",
          role: "authenticated",
        },
      },
    }),
  },
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockSupabase,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase,
}));

// ── Env variables ───────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.WEBHOOK_SECRET = "test-webhook-secret";

// ── Export helpers ──────────────────────────────────────────────

export { mockSupabase, createMockQueryBuilder, tableBuilders, getMockBuilder };

export function setTableData(
  table: string,
  data: MockData,
  error: { message: string } | null = null
): MockQueryBuilder {
  const builder = createMockQueryBuilder(data, error);
  tableBuilders.set(table, builder);
  return builder;
}

export function resetAllTables(): void {
  tableBuilders.clear();
}

// ── Test data factories ─────────────────────────────────────────

let idCounter = 0;
function uuid(): string {
  idCounter++;
  return `00000000-0000-0000-0000-${String(idCounter).padStart(12, "0")}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: "Test Contact",
    email: "test@example.com",
    phone: null,
    company: "Acme Corp",
    role: "Engineer",
    notes: null,
    tags: ["lead"],
    score: 75,
    source: "manual",
    project_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    title: "Test Task",
    description: "Do the thing",
    status: "todo",
    priority: "medium",
    due_date: "2025-06-01T00:00:00Z",
    project_id: null,
    assigned_to: null,
    recurrence_rule: null,
    is_recurring_template: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    projects: null,
    ...overrides,
  };
}

export function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    date: "2025-01-15",
    description: "Office supplies",
    amount: -120.50,
    currency: "USD",
    category: "office",
    wallet: "main",
    type: "expense",
    notes: null,
    project_id: null,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
    ...overrides,
  };
}

export function makePipelineItem(overrides: Record<string, unknown> = {}) {
  const pipelineId = uuid();
  const stageId = uuid();
  const projectId = uuid();
  return {
    id: uuid(),
    pipeline_id: pipelineId,
    stage_id: stageId,
    project_id: projectId,
    title: "Deal A",
    entity_type: "deal",
    metadata: { deal_value: 5000 },
    sort_order: 0,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makePipelineStage(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: "Lead",
    slug: "lead",
    sort_order: 0,
    color: "#3b82f6",
    pipeline_id: uuid(),
    project_id: uuid(),
    ...overrides,
  };
}

export function makeContentPost(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    title: "Blog Post",
    body: "Content here",
    caption: null,
    platform: "twitter",
    status: "draft",
    scheduled_at: "2025-03-01T10:00:00Z",
    scheduled_for: "2025-03-01T10:00:00Z",
    published_at: null,
    project_id: null,
    image_url: null,
    media_urls: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    projects: null,
    ...overrides,
  };
}

export function makeReimbursementRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    title: "Conference Travel",
    description: "Flight + hotel",
    total_amount: 1500,
    currency: "USD",
    status: "draft",
    submitted_by: "user@example.com",
    user_id: null,
    project_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeForecastRun(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: "Base scenario",
    starting_cash: 50000,
    horizon_days: 90,
    currency: "USD",
    is_preset: false,
    user_id: uuid(),
    transforms: [],
    config: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeScheduledFlow(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: "Salary",
    amount: 5000,
    direction: "inflow",
    cadence: "monthly",
    due_day: 1,
    is_active: true,
    probability: 1.0,
    category: "income",
    start_date: null,
    end_date: null,
    ...overrides,
  };
}

// ── Request helper ──────────────────────────────────────────────

export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = "GET", body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}
