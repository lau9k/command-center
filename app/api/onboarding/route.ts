import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Run all counts in parallel
    const [contactsRes, tasksRes, pipelineRes, conversationsRes, meetingsRes, stateRes] =
      await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("pipeline_items").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("meetings").select("id", { count: "exact", head: true }),
        supabase.from("onboarding_state").select("*").limit(1).maybeSingle(),
      ]);

    const steps: OnboardingStep[] = [
      {
        id: "contacts",
        label: "Add your first contact",
        description: "Import or create contacts to start building your network.",
        completed: (contactsRes.count ?? 0) > 0,
        href: "/contacts",
      },
      {
        id: "tasks",
        label: "Create a task",
        description: "Track your work with tasks across projects.",
        completed: (tasksRes.count ?? 0) > 0,
        href: "/tasks",
      },
      {
        id: "pipeline",
        label: "Add a deal to your pipeline",
        description: "Set up pipeline stages and track opportunities.",
        completed: (pipelineRes.count ?? 0) > 0,
        href: "/pipeline",
      },
      {
        id: "conversations",
        label: "Log a conversation",
        description: "Track interactions with your contacts.",
        completed: (conversationsRes.count ?? 0) > 0,
        href: "/conversations",
      },
      {
        id: "meetings",
        label: "Sync your meetings",
        description: "Connect Granola to auto-import meeting notes.",
        completed: (meetingsRes.count ?? 0) > 0,
        href: "/meetings",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;

    return Response.json({
      steps,
      completedCount,
      totalSteps: steps.length,
      dismissed: !!stateRes.data?.dismissed_at,
      welcomeSeen: !!stateRes.data?.welcome_seen_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch onboarding state";
    return Response.json({ error: message }, { status: 500 });
  }
}

const PutSchema = z.object({
  action: z.enum(["dismiss", "welcome_seen"]),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServiceClient();

    const updateField =
      parsed.data.action === "dismiss"
        ? { dismissed_at: new Date().toISOString() }
        : { welcome_seen_at: new Date().toISOString() };

    // Upsert: create if not exists, update if exists
    const { error } = await supabase.from("onboarding_state").upsert(
      {
        // Use a deterministic user_id for single-tenant setup
        user_id: "00000000-0000-0000-0000-000000000001",
        ...updateField,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update onboarding state";
    return Response.json({ error: message }, { status: 500 });
  }
}
