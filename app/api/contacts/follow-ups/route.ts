import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getContactFollowUps } from "@/lib/api/contacts";

interface FollowUpContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  score: number;
  status: string;
  last_contact_date: string | null;
  days_since_contact: number | null;
  urgency_score: number;
  urgency_label: "overdue" | "due-soon" | "upcoming" | "ok";
}

function calculateUrgency(
  daysSinceContact: number | null,
  contactScore: number
): { urgency_score: number; urgency_label: FollowUpContact["urgency_label"] } {
  if (daysSinceContact === null) {
    // Never contacted — high urgency for high-score contacts
    const score = Math.round(50 + (contactScore / 100) * 30);
    return {
      urgency_score: score,
      urgency_label: score >= 70 ? "overdue" : "due-soon",
    };
  }

  // Base urgency from days since contact
  let urgencyScore: number;
  if (daysSinceContact > 30) {
    urgencyScore = 90 + Math.min(10, daysSinceContact - 30);
  } else if (daysSinceContact > 14) {
    urgencyScore = 60 + Math.round(((daysSinceContact - 14) / 16) * 30);
  } else if (daysSinceContact > 7) {
    urgencyScore = 30 + Math.round(((daysSinceContact - 7) / 7) * 30);
  } else {
    urgencyScore = Math.round((daysSinceContact / 7) * 30);
  }

  // High-value contacts get urgency boost
  urgencyScore += Math.round((contactScore / 100) * 15);

  urgencyScore = Math.max(0, Math.min(100, urgencyScore));

  let urgencyLabel: FollowUpContact["urgency_label"];
  if (urgencyScore >= 80) urgencyLabel = "overdue";
  else if (urgencyScore >= 50) urgencyLabel = "due-soon";
  else if (urgencyScore >= 25) urgencyLabel = "upcoming";
  else urgencyLabel = "ok";

  return { urgency_score: urgencyScore, urgency_label: urgencyLabel };
}

export async function GET() {
  const supabase = createServiceClient();

  let contacts: Awaited<ReturnType<typeof getContactFollowUps>>;
  try {
    contacts = await getContactFollowUps(supabase);
  } catch {
    console.error("[API] /api/contacts/follow-ups failed");
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }

  const now = Date.now();

  const followUps: FollowUpContact[] = contacts
    .map((c) => {
      const daysSinceContact = c.last_contact_date
        ? Math.floor(
            (now - new Date(c.last_contact_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      const { urgency_score, urgency_label } = calculateUrgency(
        daysSinceContact,
        c.score ?? 0
      );

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        score: c.score ?? 0,
        status: c.status as string,
        last_contact_date: c.last_contact_date,
        days_since_contact: daysSinceContact,
        urgency_score,
        urgency_label,
      };
    })
    .filter((c) => c.urgency_label !== "ok")
    .sort((a, b) => b.urgency_score - a.urgency_score);

  return NextResponse.json({
    data: followUps,
    meta: {
      total: followUps.length,
      overdue: followUps.filter((c) => c.urgency_label === "overdue").length,
      due_soon: followUps.filter((c) => c.urgency_label === "due-soon").length,
      upcoming: followUps.filter((c) => c.urgency_label === "upcoming").length,
    },
  });
}
