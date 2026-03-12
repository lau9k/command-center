import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  source: string;
  status: string;
  tags: string[];
  score: number;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

interface DuplicatePair {
  contactA: ContactRow;
  contactB: ContactRow;
  confidence: number;
  reason: string;
}

/**
 * Compute a simple bigram similarity score between two strings (0–1).
 * Used for fuzzy name matching.
 */
function bigramSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sa = norm(a);
  const sb = norm(b);
  if (sa === sb) return 1;
  if (sa.length < 2 || sb.length < 2) return 0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      set.add(s.slice(i, i + 2));
    }
    return set;
  };

  const setA = bigrams(sa);
  const setB = bigrams(sb);
  let intersection = 0;
  for (const b of setA) {
    if (setB.has(b)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * GET /api/contacts/dedup
 * Returns duplicate contact pairs with confidence scores.
 * Matches by exact email + fuzzy name similarity.
 */
export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, company, role, source, status, tags, score, notes, last_contact_date, created_at, updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ pairs: [] });
  }

  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  // Group by normalised email for exact email matches
  const emailMap = new Map<string, ContactRow[]>();
  for (const c of contacts as ContactRow[]) {
    if (c.email) {
      const key = c.email.toLowerCase().trim();
      if (!emailMap.has(key)) emailMap.set(key, []);
      emailMap.get(key)!.push(c);
    }
  }

  for (const [, group] of emailMap) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const pairKey = [group[i].id, group[j].id].sort().join(":");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        pairs.push({
          contactA: group[i],
          contactB: group[j],
          confidence: 0.95,
          reason: "Exact email match",
        });
      }
    }
  }

  // Fuzzy name similarity for contacts without email matches
  const allContacts = contacts as ContactRow[];
  for (let i = 0; i < allContacts.length; i++) {
    for (let j = i + 1; j < allContacts.length; j++) {
      const a = allContacts[i];
      const b = allContacts[j];
      const pairKey = [a.id, b.id].sort().join(":");
      if (seen.has(pairKey)) continue;

      const nameSim = bigramSimilarity(a.name, b.name);
      if (nameSim < 0.7) continue;

      // Boost confidence if company also matches
      let confidence = nameSim * 0.8;
      if (a.company && b.company) {
        const companySim = bigramSimilarity(a.company, b.company);
        if (companySim > 0.7) {
          confidence = Math.min(confidence + 0.15, 0.95);
        }
      }

      if (confidence >= 0.55) {
        seen.add(pairKey);
        const reasons: string[] = [`Name similarity (${Math.round(nameSim * 100)}%)`];
        if (a.company && b.company && bigramSimilarity(a.company, b.company) > 0.7) {
          reasons.push("Similar company");
        }
        pairs.push({
          contactA: a,
          contactB: b,
          confidence: Math.round(confidence * 100) / 100,
          reason: reasons.join(" + "),
        });
      }
    }
  }

  // Sort by confidence descending
  pairs.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({ pairs });
});
