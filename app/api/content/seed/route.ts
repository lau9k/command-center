import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// 28 real content posts derived from content-master-clean.csv
const SEED_POSTS = [
  // ── MEEK posts (14) ──────────────────────────────────────
  {
    title: "MEEK Weekly Update #12",
    brand: "meek",
    content_type: "Thread",
    caption: "Big week for $MEEK! New partnerships announced, bot revenue up 15%, and community growth hitting new highs. Full thread below.",
    tone: "Informative",
    status: "published",
    week_offset: -7,
    platform: "twitter",
  },
  {
    title: "Community AMA Announcement",
    brand: "meek",
    content_type: "Announcement",
    caption: "Join us this Friday for a live AMA with the MEEK team! We'll be discussing the roadmap, token utility, and upcoming features.",
    tone: "Engaging",
    status: "scheduled",
    week_offset: 3,
    platform: "twitter",
  },
  {
    title: "Bot Revenue Milestone — $800/mo",
    brand: "meek",
    content_type: "Milestone",
    caption: "MEEK Telegram bot just crossed $800/mo in revenue! Here's how we built a sustainable crypto project with real cashflow.",
    tone: "Celebratory",
    status: "published",
    week_offset: -14,
    platform: "linkedin",
  },
  {
    title: "Token Utility Explainer",
    brand: "meek",
    content_type: "Educational",
    caption: "What makes $MEEK different? Real utility, real revenue, real community. Here's our token utility breakdown.",
    tone: "Educational",
    status: "scheduled",
    week_offset: 5,
    platform: "instagram",
  },
  {
    title: "Partnership Teaser",
    brand: "meek",
    content_type: "Teaser",
    caption: "Something big is coming to the MEEK ecosystem. Stay tuned for a major partnership announcement this week.",
    tone: "Mysterious",
    status: "draft",
    week_offset: 7,
    platform: "twitter",
  },
  {
    title: "MEEK Tokenomics Deep Dive",
    brand: "meek",
    content_type: "Thread",
    caption: "Let's break down $MEEK tokenomics: supply, burn mechanism, revenue sharing, and why this model works long-term.",
    tone: "Analytical",
    status: "draft",
    week_offset: 10,
    platform: "twitter",
  },
  {
    title: "Telegram Bot Feature Update",
    brand: "meek",
    content_type: "Product Update",
    caption: "New features dropping on the MEEK Telegram bot: auto-buy alerts, portfolio tracking, and whale monitoring.",
    tone: "Exciting",
    status: "ready",
    week_offset: 4,
    platform: "telegram",
  },
  {
    title: "Community Growth Recap — Q1",
    brand: "meek",
    content_type: "Recap",
    caption: "Q1 recap: 3,200 new holders, 40% bot revenue growth, 2 new exchange listings. Here's the full breakdown.",
    tone: "Proud",
    status: "published",
    week_offset: -21,
    platform: "twitter",
  },
  {
    title: "MEEK vs Traditional Memecoins",
    brand: "meek",
    content_type: "Comparison",
    caption: "Most memecoins have zero utility. MEEK generates real revenue through its bot ecosystem. Here's the difference.",
    tone: "Persuasive",
    status: "scheduled",
    week_offset: 6,
    platform: "linkedin",
  },
  {
    title: "Holder Spotlight — Top Contributors",
    brand: "meek",
    content_type: "Community",
    caption: "Shoutout to our top community contributors this month! Your engagement keeps the MEEK ecosystem thriving.",
    tone: "Appreciative",
    status: "draft",
    week_offset: 8,
    platform: "twitter",
  },
  {
    title: "MEEK Staking Guide",
    brand: "meek",
    content_type: "Tutorial",
    caption: "Step-by-step guide to staking your $MEEK tokens and earning passive revenue from bot fees.",
    tone: "Instructional",
    status: "ready",
    week_offset: 2,
    platform: "youtube",
  },
  {
    title: "Weekly Alpha Thread",
    brand: "meek",
    content_type: "Thread",
    caption: "This week's alpha: upcoming catalyst, on-chain metrics looking strong, and a sneak peek at the new dashboard.",
    tone: "Insider",
    status: "scheduled",
    week_offset: 1,
    platform: "twitter",
  },
  {
    title: "MEEK Roadmap Update — H2",
    brand: "meek",
    content_type: "Roadmap",
    caption: "H2 roadmap reveal: DEX aggregator integration, cross-chain expansion, and governance token launch.",
    tone: "Visionary",
    status: "draft",
    week_offset: 12,
    platform: "twitter",
  },
  {
    title: "Behind the Scenes — Dev Update",
    brand: "meek",
    content_type: "Behind the Scenes",
    caption: "What the MEEK dev team has been working on: new architecture, performance improvements, and security audits.",
    tone: "Transparent",
    status: "ready",
    week_offset: 3,
    platform: "youtube",
  },
  // ── Personize posts (14) ─────────────────────────────────
  {
    title: "Personize Launch Announcement",
    brand: "personize",
    content_type: "Announcement",
    caption: "Introducing Personize — AI-powered sales outreach that actually sounds human. Early access now open.",
    tone: "Exciting",
    status: "published",
    week_offset: -28,
    platform: "linkedin",
  },
  {
    title: "Cold Email vs AI Outreach — Stats",
    brand: "personize",
    content_type: "Data Post",
    caption: "Traditional cold email: 2% reply rate. AI-personalized outreach: 12% reply rate. The data speaks for itself.",
    tone: "Data-driven",
    status: "published",
    week_offset: -21,
    platform: "linkedin",
  },
  {
    title: "Customer Story — SaaS Startup",
    brand: "personize",
    content_type: "Case Study",
    caption: "How a 5-person SaaS startup booked 40 meetings in their first month using Personize. Full case study.",
    tone: "Social Proof",
    status: "published",
    week_offset: -14,
    platform: "linkedin",
  },
  {
    title: "Product Demo — AI Personalization",
    brand: "personize",
    content_type: "Demo",
    caption: "Watch how Personize analyzes a prospect's LinkedIn, recent posts, and company news to craft the perfect opener.",
    tone: "Educational",
    status: "scheduled",
    week_offset: 2,
    platform: "youtube",
  },
  {
    title: "Sales Tips — Outbound in 2026",
    brand: "personize",
    content_type: "Thought Leadership",
    caption: "5 outbound sales strategies that still work in 2026. Hint: spray-and-pray is dead.",
    tone: "Authoritative",
    status: "scheduled",
    week_offset: 4,
    platform: "linkedin",
  },
  {
    title: "Personize Integration — HubSpot",
    brand: "personize",
    content_type: "Product Update",
    caption: "Personize now integrates with HubSpot CRM. Sync contacts, track opens, and automate follow-ups.",
    tone: "Practical",
    status: "ready",
    week_offset: 5,
    platform: "linkedin",
  },
  {
    title: "Founder Story — Why We Built Personize",
    brand: "personize",
    content_type: "Narrative",
    caption: "After sending 10,000 cold emails manually, we knew there had to be a better way. Here's why we built Personize.",
    tone: "Personal",
    status: "draft",
    week_offset: 7,
    platform: "linkedin",
  },
  {
    title: "AI Sales Trends — Weekly Digest",
    brand: "personize",
    content_type: "Digest",
    caption: "This week in AI sales: new GPT features, competitor moves, and what it means for your outbound strategy.",
    tone: "Informative",
    status: "scheduled",
    week_offset: 1,
    platform: "twitter",
  },
  {
    title: "Personize ROI Calculator",
    brand: "personize",
    content_type: "Interactive",
    caption: "How much revenue could Personize generate for your team? Try our ROI calculator and see the numbers.",
    tone: "Persuasive",
    status: "draft",
    week_offset: 9,
    platform: "linkedin",
  },
  {
    title: "Team Spotlight — Engineering",
    brand: "personize",
    content_type: "Culture",
    caption: "Meet the engineering team behind Personize. How we build AI that respects privacy while maximizing relevance.",
    tone: "Authentic",
    status: "draft",
    week_offset: 11,
    platform: "instagram",
  },
  {
    title: "Webinar — Scaling Outbound with AI",
    brand: "personize",
    content_type: "Event",
    caption: "Free webinar: How to scale outbound sales without scaling headcount. Featuring 3 customer success stories.",
    tone: "Inviting",
    status: "scheduled",
    week_offset: 6,
    platform: "linkedin",
  },
  {
    title: "Personize vs Manual Outreach",
    brand: "personize",
    content_type: "Comparison",
    caption: "We tested Personize against a top SDR for 30 days. The results surprised even us.",
    tone: "Competitive",
    status: "ready",
    week_offset: 3,
    platform: "twitter",
  },
  {
    title: "Email Deliverability Guide",
    brand: "personize",
    content_type: "Guide",
    caption: "Your emails are landing in spam? Here's our complete guide to email deliverability in 2026.",
    tone: "Helpful",
    status: "ready",
    week_offset: 2,
    platform: "linkedin",
  },
  {
    title: "Customer Testimonials Reel",
    brand: "personize",
    content_type: "Social Proof",
    caption: "Real customers, real results. Hear from 5 teams who transformed their outbound with Personize.",
    tone: "Authentic",
    status: "draft",
    week_offset: 10,
    platform: "instagram",
  },
];

const BRAND_SLUG_MAP: Record<string, string> = {
  meek: "meek",
  personize: "personize",
};

export async function POST() {
  try {
    const supabase = createServiceClient();

    // Resolve brand → project_id
    const brandProjectMap = new Map<string, string>();
    for (const [keyword, slug] of Object.entries(BRAND_SLUG_MAP)) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .single();

      if (project) {
        brandProjectMap.set(keyword, project.id);
      }
    }

    // Use a fallback project_id if brands aren't found
    let fallbackProjectId: string | null = null;
    if (brandProjectMap.size === 0) {
      const { data: anyProject } = await supabase
        .from("projects")
        .select("id")
        .limit(1)
        .single();
      fallbackProjectId = anyProject?.id ?? null;
    }

    // Get a service-level user_id (first user in the system)
    const { data: userData } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    const userId = userData?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "No user found in profiles table" },
        { status: 400 }
      );
    }

    const now = new Date();
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < SEED_POSTS.length; i++) {
      const post = SEED_POSTS[i];
      try {
        const projectId =
          brandProjectMap.get(post.brand) ?? fallbackProjectId;

        if (!projectId) {
          errors.push(`Row ${i + 1}: No project found for brand "${post.brand}"`);
          continue;
        }

        const scheduledAt = new Date(now);
        scheduledAt.setDate(scheduledAt.getDate() + post.week_offset);
        scheduledAt.setHours(10, 0, 0, 0);

        const { error } = await supabase.from("content_posts").insert({
          project_id: projectId,
          user_id: userId,
          title: post.title,
          caption: post.caption,
          platform: post.platform,
          status: post.status,
          scheduled_at: scheduledAt.toISOString(),
          metadata: {
            content_type: post.content_type,
            tone: post.tone,
          },
        });

        if (error) throw new Error(error.message);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 1} (${post.title}): ${msg}`);
      }
    }

    return NextResponse.json({
      imported,
      total: SEED_POSTS.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
