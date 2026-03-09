const PG_ERROR_MAP: Record<string, string> = {
  "23505": "A record with this value already exists (unique constraint violation).",
  "23503": "Referenced record not found (foreign key violation).",
  "23502": "A required field is missing (not-null violation).",
  "23514": "Value does not meet validation requirements (check constraint violation).",
  "42P01": "The requested table does not exist.",
  "42703": "The requested column does not exist.",
  "22P02": "Invalid input syntax for the given data type.",
  "28000": "Authentication failed.",
  "28P01": "Invalid password.",
  "42501": "Insufficient permissions to perform this operation.",
  "57014": "Query was cancelled due to timeout.",
  "PGRST116": "No rows found matching the query.",
};

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function formatError(error: SupabaseError): string {
  const code = error.code ?? "UNKNOWN";
  const friendly = PG_ERROR_MAP[code];

  if (friendly) {
    return `[${code}] ${friendly}`;
  }

  return `[${code}] ${error.message}`;
}
