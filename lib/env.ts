/**
 * Typed environment accessor with validation.
 * Validates required vars are present and warns about missing production vars in preview.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  // Supabase — REQUIRED
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),

  // Sentry — REQUIRED
  SENTRY_DSN: optional("SENTRY_DSN"),
  NEXT_PUBLIC_SENTRY_DSN: optional("NEXT_PUBLIC_SENTRY_DSN"),
  SENTRY_ORG: optional("SENTRY_ORG"),
  SENTRY_PROJECT: optional("SENTRY_PROJECT"),
  SENTRY_AUTH_TOKEN: optional("SENTRY_AUTH_TOKEN"),

  // API Security — REQUIRED
  API_SECRET: optional("API_SECRET"),
  CRON_KEY: optional("CRON_KEY"),

  // Personize — OPTIONAL
  PERSONIZE_SECRET_KEY: optional("PERSONIZE_SECRET_KEY"),
  PERSONIZE_API_KEY: optional("PERSONIZE_API_KEY"),

  // Anthropic — OPTIONAL
  ANTHROPIC_API_KEY: optional("ANTHROPIC_API_KEY"),

  // Plaid — OPTIONAL
  PLAID_CLIENT_ID: optional("PLAID_CLIENT_ID"),
  PLAID_SECRET: optional("PLAID_SECRET"),
  PLAID_ENV: optional("PLAID_ENV"),

  // GitHub — OPTIONAL
  GITHUB_TOKEN: optional("GITHUB_TOKEN"),

  // Telegram — OPTIONAL
  TELEGRAM_BOT_TOKEN: optional("TELEGRAM_BOT_TOKEN"),

  // Upstash — OPTIONAL (for rate limiting)
  UPSTASH_REDIS_REST_URL: optional("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optional("UPSTASH_REDIS_REST_TOKEN"),

  // Vercel — injected automatically
  VERCEL_ENV: (process.env.VERCEL_ENV ?? "development") as
    | "production"
    | "preview"
    | "development",
  VERCEL_GIT_COMMIT_SHA: optional("VERCEL_GIT_COMMIT_SHA"),

  get isProduction() {
    return this.VERCEL_ENV === "production";
  },
  get isPreview() {
    return this.VERCEL_ENV === "preview";
  },
} as const;

// Warn about missing production vars in preview/development
const PRODUCTION_VARS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "API_SECRET",
  "CRON_KEY",
] as const;

if (!env.isProduction) {
  for (const name of PRODUCTION_VARS) {
    if (!process.env[name]) {
      console.warn(
        `[env] Warning: ${name} is not set — required in production`
      );
    }
  }
}
