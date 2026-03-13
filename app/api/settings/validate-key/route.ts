import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const validateKeySchema = z.object({
  provider: z.enum(["personize", "anthropic", "supabase"]),
  key: z.string().min(1, "API key is required"),
});

async function validatePersonize(key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch("https://api.personize.ai/v1/health", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return { valid: true, message: "Personize API key is valid" };
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "Invalid or expired Personize API key" };
    }
    return { valid: false, message: `Personize API returned status ${res.status}` };
  } catch {
    return { valid: false, message: "Unable to reach Personize API. Check your key and try again." };
  }
}

async function validateAnthropic(key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return { valid: true, message: "Anthropic API key is valid" };
    }
    if (res.status === 401) {
      return { valid: false, message: "Invalid Anthropic API key" };
    }
    if (res.status === 403) {
      return { valid: false, message: "Anthropic API key lacks required permissions" };
    }
    return { valid: false, message: `Anthropic API returned status ${res.status}` };
  } catch {
    return { valid: false, message: "Unable to reach Anthropic API. Check your key and try again." };
  }
}

async function validateSupabase(key: string): Promise<{ valid: boolean; message: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { valid: false, message: "Supabase URL is not configured" };
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return { valid: true, message: "Supabase key is valid" };
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "Invalid or unauthorized Supabase key" };
    }
    return { valid: false, message: `Supabase returned status ${res.status}` };
  } catch {
    return { valid: false, message: "Unable to reach Supabase. Check your configuration." };
  }
}

const validators: Record<string, (key: string) => Promise<{ valid: boolean; message: string }>> = {
  personize: validatePersonize,
  anthropic: validateAnthropic,
  supabase: validateSupabase,
};

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = validateKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { provider, key } = parsed.data;
  const result = await validators[provider](key);

  return NextResponse.json(result);
});
