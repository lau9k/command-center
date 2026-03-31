import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { PipelineItem } from "@/lib/types/database";

// ── Select clauses ───────────────────────────────────────

const PIPELINE_ITEM_COLUMNS =
  "id, pipeline_id, stage_id, project_id, title, entity_type, entity_id, metadata, sort_order, created_at, updated_at" as const;

// ── Read ─────────────────────────────────────────────────

export async function getDealById(id: string): Promise<PipelineItem | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_items")
    .select(PIPELINE_ITEM_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as PipelineItem;
}

export interface GetDealsFilters {
  stage_id?: string;
  pipeline_id?: string;
}

export async function getDeals(
  filters?: GetDealsFilters
): Promise<PipelineItem[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("pipeline_items")
    .select(PIPELINE_ITEM_COLUMNS)
    .order("sort_order", { ascending: true });

  if (filters?.stage_id) {
    query = query.eq("stage_id", filters.stage_id);
  }
  if (filters?.pipeline_id) {
    query = query.eq("pipeline_id", filters.pipeline_id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as PipelineItem[];
}

// ── Write ────────────────────────────────────────────────

export async function createDeal(
  data: Partial<PipelineItem>
): Promise<PipelineItem> {
  const supabase = createServiceClient();

  const { data: created, error } = await supabase
    .from("pipeline_items")
    .insert(data)
    .select(PIPELINE_ITEM_COLUMNS)
    .single();

  if (error) throw error;

  return created as PipelineItem;
}

export async function updateDeal(
  id: string,
  updates: Partial<PipelineItem>
): Promise<PipelineItem> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_items")
    .update(updates)
    .eq("id", id)
    .select(PIPELINE_ITEM_COLUMNS)
    .single();

  if (error) throw error;

  return data as PipelineItem;
}

export async function moveDealToStage(
  id: string,
  stage_id: string
): Promise<PipelineItem> {
  return updateDeal(id, { stage_id });
}

export async function deleteDeal(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("pipeline_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
