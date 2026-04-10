import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const createMappingSchema = z.object({
  contact_id: z.string().uuid(),
  personize_record_id: z.string().nullable().optional(),
  primary_email: z.string().email(),
  alternate_emails: z.array(z.string().email()).default([]),
  canonical_name: z.string().min(1).max(500),
  aliases: z.array(z.string().min(1).max(200)).default([]),
  company_domain: z.string().nullable().optional(),
  confidence_score: z.number().min(0).max(1).default(1.0),
});

const updateMappingSchema = z.object({
  id: z.string().uuid(),
  aliases: z.array(z.string().min(1).max(200)).optional(),
  alternate_emails: z.array(z.string().email()).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  personize_record_id: z.string().nullable().optional(),
  company_domain: z.string().nullable().optional(),
  last_verified_at: z.string().datetime().optional(),
});

/**
 * GET /api/memory/identity-map
 * List all identity map entries with optional pagination.
 */
export const GET = withErrorHandler(
  withAuth(async function GET(request, _user) {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

    const supabase = createServiceClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(id, name, email, company)", { count: "exact" })
      .order("canonical_name", { ascending: true })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        hasMore: page * pageSize < (count ?? 0),
      },
    });
  }),
);

/**
 * POST /api/memory/identity-map
 * Create a new identity map entry.
 */
export const POST = withErrorHandler(
  withAuth(async function POST(request, _user) {
    const body = await request.json();
    const parsed = createMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Store aliases lowercased for consistent matching
    const insertData = {
      ...parsed.data,
      aliases: parsed.data.aliases.map((a) => a.toLowerCase()),
    };

    const { data, error } = await supabase
      .from("contact_identity_map")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A mapping with this primary email already exists" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  }),
);

/**
 * PATCH /api/memory/identity-map
 * Update an existing identity map entry (aliases, confidence, etc.).
 */
export const PATCH = withErrorHandler(
  withAuth(async function PATCH(request, _user) {
    const body = await request.json();
    const parsed = updateMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, ...updates } = parsed.data;
    const supabase = createServiceClient();

    // Lowercase aliases if provided
    if (updates.aliases) {
      updates.aliases = updates.aliases.map((a) => a.toLowerCase());
    }

    const { data, error } = await supabase
      .from("contact_identity_map")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  }),
);
