// ── Filter types ──────────────────────────────────────────

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "ilike"
  | "in"
  | "is_null"
  | "is_not_null";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | null;
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  entity_type: string;
  filters: FilterCondition[];
  sort_by: string | null;
  sort_direction: "asc" | "desc";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Operator metadata (for UI) ────────────────────────────

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "equals",
  neq: "not equals",
  gt: "greater than",
  gte: "greater or equal",
  lt: "less than",
  lte: "less or equal",
  ilike: "contains",
  in: "is one of",
  is_null: "is empty",
  is_not_null: "is not empty",
};

export const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  text: ["eq", "neq", "ilike", "is_null", "is_not_null"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
  date: ["eq", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
  enum: ["eq", "neq", "in", "is_null", "is_not_null"],
  boolean: ["eq"],
};

// ── Apply filters to a Supabase query ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<Q extends Record<string, any>>(
  query: Q,
  filters: FilterCondition[]
): Q {
  let q = query;

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case "eq":
        q = q.eq(field, value) as typeof q;
        break;
      case "neq":
        q = q.neq(field, value) as typeof q;
        break;
      case "gt":
        q = q.gt(field, value) as typeof q;
        break;
      case "gte":
        q = q.gte(field, value) as typeof q;
        break;
      case "lt":
        q = q.lt(field, value) as typeof q;
        break;
      case "lte":
        q = q.lte(field, value) as typeof q;
        break;
      case "ilike":
        q = q.ilike(field, `%${value}%`) as typeof q;
        break;
      case "in":
        q = q.in(field, Array.isArray(value) ? value : [value]) as typeof q;
        break;
      case "is_null":
        q = q.is(field, null) as typeof q;
        break;
      case "is_not_null":
        q = q.not(field, "is", null) as typeof q;
        break;
    }
  }

  return q;
}

// ── Serialize / deserialize filters for URL params ────────

export function filtersToSearchParams(filters: FilterCondition[]): string {
  if (filters.length === 0) return "";
  return encodeURIComponent(JSON.stringify(filters));
}

export function filtersFromSearchParams(param: string | null): FilterCondition[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(param));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Serialize / deserialize filters for saved views (JSON) ─

export function serializeFilters(filters: FilterCondition[]): string {
  return JSON.stringify(filters);
}

export function deserializeFilters(json: string | null): FilterCondition[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Compare two filter sets for equality ──────────────────

export function filtersEqual(
  a: FilterCondition[],
  b: FilterCondition[]
): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
