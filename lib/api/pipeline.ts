import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { PipelineItem, PipelineStage } from "@/lib/types/database";

// ── Select clauses ───────────────────────────────────────

const PIPELINE_ITEM_COLUMNS =
  "id, pipeline_id, stage_id, project_id, title, entity_type, entity_id, metadata, sort_order, created_at, updated_at" as const;

const PIPELINE_STAGE_COLUMNS =
  "id, pipeline_id, project_id, name, slug, sort_order, color" as const;

// ── Stage Read ──────────────────────────────────────────

export async function getPipelineStageById(
  id: string
): Promise<PipelineStage | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select(PIPELINE_STAGE_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as PipelineStage;
}

export interface GetPipelineStagesFilters {
  pipeline_id?: string;
  project_id?: string;
}

export async function getPipelineStages(
  filters?: GetPipelineStagesFilters
): Promise<PipelineStage[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("pipeline_stages")
    .select(PIPELINE_STAGE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (filters?.pipeline_id) {
    query = query.eq("pipeline_id", filters.pipeline_id);
  }
  if (filters?.project_id) {
    query = query.eq("project_id", filters.project_id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as PipelineStage[];
}

export async function getPipelineStageBySlug(
  pipelineId: string,
  slug: string
): Promise<PipelineStage | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select(PIPELINE_STAGE_COLUMNS)
    .eq("pipeline_id", pipelineId)
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as PipelineStage;
}

// ── Stage Write ─────────────────────────────────────────

export interface CreatePipelineStageInput {
  pipeline_id: string;
  project_id: string;
  name: string;
  slug: string;
  sort_order?: number;
  color?: string | null;
}

export async function createPipelineStage(
  input: CreatePipelineStageInput
): Promise<PipelineStage> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .insert(input)
    .select(PIPELINE_STAGE_COLUMNS)
    .single();

  if (error) throw error;

  return data as PipelineStage;
}

export interface UpdatePipelineStageInput {
  name?: string;
  slug?: string;
  sort_order?: number;
  color?: string | null;
}

export async function updatePipelineStage(
  id: string,
  input: UpdatePipelineStageInput
): Promise<PipelineStage> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .update(input)
    .eq("id", id)
    .select(PIPELINE_STAGE_COLUMNS)
    .single();

  if (error) throw error;

  return data as PipelineStage;
}

export async function deletePipelineStage(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function reorderPipelineStages(
  stageIds: string[]
): Promise<PipelineStage[]> {
  const supabase = createServiceClient();

  const updates = stageIds.map((id, index) =>
    supabase
      .from("pipeline_stages")
      .update({ sort_order: index })
      .eq("id", id)
      .select(PIPELINE_STAGE_COLUMNS)
      .single()
  );

  const results = await Promise.all(updates);

  const stages: PipelineStage[] = [];
  for (const result of results) {
    if (result.error) throw result.error;
    stages.push(result.data as PipelineStage);
  }

  return stages.sort((a, b) => a.sort_order - b.sort_order);
}

// ── Item Read ───────────────────────────────────────────

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
  entity_type?: string;
  search?: string;
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
  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as PipelineItem[];
}

// ── Item Write ──────────────────────────────────────────

export interface CreateDealInput {
  title: string;
  pipeline_id: string;
  stage_id: string;
  project_id: string;
  entity_type?: string | null;
  entity_id?: string | null;
  sort_order?: number;
  metadata?: Record<string, unknown> | null;
}

export async function createDeal(
  input: CreateDealInput
): Promise<PipelineItem> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_items")
    .insert(input)
    .select(PIPELINE_ITEM_COLUMNS)
    .single();

  if (error) throw error;

  return data as PipelineItem;
}

export interface UpdateDealInput {
  title?: string;
  stage_id?: string;
  sort_order?: number;
  metadata?: Record<string, unknown> | null;
}

export async function updateDeal(
  id: string,
  updates: UpdateDealInput
): Promise<PipelineItem> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("pipeline_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
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

// ── Composite ───────────────────────────────────────────

export async function getPipelineWithStages(pipelineId: string): Promise<{
  stages: PipelineStage[];
  items: PipelineItem[];
}> {
  const [stages, items] = await Promise.all([
    getPipelineStages({ pipeline_id: pipelineId }),
    getDeals({ pipeline_id: pipelineId }),
  ]);

  return { stages, items };
}
