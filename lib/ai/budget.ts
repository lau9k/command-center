import { createServiceClient } from "@/lib/supabase/service";

// ── Types ────────────────────────────────────────────────

export type DegradationLevel = "normal" | "conservative" | "minimal" | "frozen";

export type ModeRecommendation = "fast" | "full" | "denied";

export interface BudgetDecision {
  allowed: boolean;
  remaining_tokens: number;
  remaining_for_feature: number;
  mode_recommendation: ModeRecommendation;
  degradation_level: DegradationLevel;
}

export interface BudgetStatus {
  date: string;
  daily_limit: number;
  used_tokens: number;
  hard_cap: number;
  degradation_level: DegradationLevel;
  usage_percentage: number;
  features: Record<string, { weight: number; min_reserve: number; allocated: number }>;
}

interface FeatureWeight {
  feature: string;
  weight: number;
  min_reserve: number;
}

// ── Helpers ──────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDegradationLevel(usedTokens: number, dailyLimit: number): DegradationLevel {
  if (dailyLimit <= 0) return "frozen";
  const pct = usedTokens / dailyLimit;
  if (pct >= 0.95) return "frozen";
  if (pct >= 0.85) return "minimal";
  if (pct >= 0.7) return "conservative";
  return "normal";
}

function modeForDegradation(level: DegradationLevel): ModeRecommendation {
  switch (level) {
    case "normal":
      return "full";
    case "conservative":
    case "minimal":
      return "fast";
    case "frozen":
      return "denied";
  }
}

async function ensureDailyBudget(userId: string) {
  const supabase = createServiceClient();
  const date = todayDate();

  // Try to fetch existing row
  const { data } = await supabase
    .from("ai_token_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  if (data) return data;

  // Auto-create today's row
  const { data: created, error } = await supabase
    .from("ai_token_budgets")
    .insert({ user_id: userId, date })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create daily budget: ${error.message}`);
  return created;
}

async function getFeatureWeights(): Promise<FeatureWeight[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("ai_feature_weights").select("*");
  if (error) throw new Error(`Failed to fetch feature weights: ${error.message}`);
  return data as FeatureWeight[];
}

// ── Core Functions ───────────────────────────────────────

export async function checkBudget(
  userId: string,
  feature: string,
  estimatedCost: number,
): Promise<BudgetDecision> {
  const budget = await ensureDailyBudget(userId);
  const weights = await getFeatureWeights();

  const featureWeight = weights.find((w) => w.feature === feature);
  const weightPct = featureWeight ? featureWeight.weight / 100 : 0;
  const featureAllocation = Math.floor(budget.daily_limit * weightPct);
  const minReserve = featureWeight?.min_reserve ?? 0;

  const remaining = Math.max(0, budget.daily_limit - budget.used_tokens);
  const remainingForFeature = Math.max(0, featureAllocation - budget.used_tokens * weightPct + minReserve);

  const degradation = getDegradationLevel(budget.used_tokens, budget.daily_limit);

  // Deny if over hard cap or frozen
  const overHardCap = budget.used_tokens + estimatedCost > budget.hard_cap;
  const allowed = degradation !== "frozen" && !overHardCap && estimatedCost <= remaining;

  return {
    allowed,
    remaining_tokens: remaining,
    remaining_for_feature: Math.round(remainingForFeature),
    mode_recommendation: allowed ? modeForDegradation(degradation) : "denied",
    degradation_level: degradation,
  };
}

export async function recordUsage(
  userId: string,
  feature: string,
  tokensUsed: number,
): Promise<void> {
  const budget = await ensureDailyBudget(userId);
  const supabase = createServiceClient();

  // Validate feature exists
  const weights = await getFeatureWeights();
  const validFeature = weights.some((w) => w.feature === feature);
  if (!validFeature) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  const { error } = await supabase
    .from("ai_token_budgets")
    .update({ used_tokens: budget.used_tokens + tokensUsed })
    .eq("id", budget.id);

  if (error) throw new Error(`Failed to record usage: ${error.message}`);
}

export async function getDailyBudgetStatus(userId: string): Promise<BudgetStatus> {
  const budget = await ensureDailyBudget(userId);
  const weights = await getFeatureWeights();

  const features: BudgetStatus["features"] = {};
  for (const w of weights) {
    features[w.feature] = {
      weight: w.weight,
      min_reserve: w.min_reserve,
      allocated: Math.floor(budget.daily_limit * (w.weight / 100)),
    };
  }

  const usagePct = budget.daily_limit > 0 ? (budget.used_tokens / budget.daily_limit) * 100 : 100;

  return {
    date: budget.date,
    daily_limit: budget.daily_limit,
    used_tokens: budget.used_tokens,
    hard_cap: budget.hard_cap,
    degradation_level: getDegradationLevel(budget.used_tokens, budget.daily_limit),
    usage_percentage: Math.round(usagePct * 100) / 100,
    features,
  };
}
