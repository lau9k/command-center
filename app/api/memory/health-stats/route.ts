import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import type { Contact } from "@/lib/types/database";

export interface MemoryHealthStatsResponse {
  totalContacts: number;
  contactsWithMemories: number;
  contactsWithoutMemories: number;
  lastIngestionDate: string | null;
  topGaps: Array<{
    id: string;
    name: string;
    email: string | null;
    score: number;
    memorized_at: string | null;
  }>;
}

export const GET = withErrorHandler(
  withAuth(async function GET() {
    const supabase = createServiceClient();

    // Run all queries in parallel
    const [totalRes, withMemoriesRes, lastIngestionRes, gapsRes] =
      await Promise.all([
        // 1. Total contacts
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true }),

        // 2. Contacts with memories (memorized_at is set)
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .not("memorized_at", "is", null),

        // 3. Most recent memorized_at across all contacts
        supabase
          .from("contacts")
          .select("memorized_at")
          .not("memorized_at", "is", null)
          .order("memorized_at", { ascending: false })
          .limit(1)
          .single(),

        // 4. Top gaps: high-engagement contacts with no memories
        supabase
          .from("contacts")
          .select("id, name, email, score, memorized_at")
          .is("memorized_at", null)
          .order("score", { ascending: false })
          .limit(10),
      ]);

    const totalContacts = totalRes.count ?? 0;
    const contactsWithMemories = withMemoriesRes.count ?? 0;
    const contactsWithoutMemories = totalContacts - contactsWithMemories;
    const lastIngestionDate =
      (lastIngestionRes.data as { memorized_at: string } | null)
        ?.memorized_at ?? null;

    const topGaps = ((gapsRes.data ?? []) as Pick<Contact, "id" | "name" | "email" | "score" | "memorized_at">[]).map(
      (c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        score: c.score,
        memorized_at: c.memorized_at,
      })
    );

    const data: MemoryHealthStatsResponse = {
      totalContacts,
      contactsWithMemories,
      contactsWithoutMemories,
      lastIngestionDate,
      topGaps,
    };

    return NextResponse.json({ data });
  })
);
