"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getDealById,
  moveDealToStage,
  updateDeal,
  createDeal as createDealInDb,
  deleteDeal as deleteDealInDb,
  getPipelineStageById,
} from "@/lib/api/pipeline";
import type { CreateDealInput, UpdateDealInput } from "@/lib/api/pipeline";
import type { PipelineItem } from "@/lib/types/database";
import { syncDealToPersonize } from "@/lib/personize/sync";

export async function moveDealStage(
  id: string,
  stage_id: string
): Promise<PipelineItem> {
  return moveDealToStage(id, stage_id);
}

export async function updateDealAmount(
  id: string,
  amount: number
): Promise<PipelineItem> {
  const deal = await getDealById(id);
  const existing = deal?.metadata ?? {};

  return updateDeal(id, {
    metadata: { ...existing, amount },
  });
}

export async function createDeal(
  data: CreateDealInput
): Promise<PipelineItem> {
  return createDealInDb(data);
}

// ── Zod Schemas ─────────────────────────────────────────

const createPipelineSchema = z.object({
  title: z.string().min(1),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  project_id: z.string().uuid(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

const updatePipelineSchema = z.object({
  title: z.string().min(1).optional(),
  stage_id: z.string().uuid().optional(),
  sort_order: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

// ── Mutation Actions ────────────────────────────────────

type ActionResult<T = PipelineItem> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createDealAction(
  data: CreateDealInput
): Promise<ActionResult> {
  try {
    const parsed = createPipelineSchema.parse(data);
    const item = await createDealInDb(parsed);
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create deal",
    };
  }
}

export async function updateDealAction(
  id: string,
  data: UpdateDealInput
): Promise<ActionResult> {
  try {
    const parsed = updatePipelineSchema.parse(data);
    const item = await updateDeal(id, parsed);
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update deal",
    };
  }
}

export async function moveDealAction(
  id: string,
  stageId: string
): Promise<ActionResult> {
  try {
    const item = await moveDealToStage(id, stageId);
    revalidatePath("/pipeline");
    revalidatePath("/");

    // Fire-and-forget sync to Personize
    const stage = await getPipelineStageById(stageId);
    void syncDealToPersonize({
      company_name: item.title,
      amount:
        (item.metadata as Record<string, unknown> | null)?.amount as
          | number
          | null ?? null,
      stage_name: stage?.name ?? stageId,
      notes: null,
      contact_email:
        (item.metadata as Record<string, unknown> | null)?.contact_email as
          | string
          | null ?? null,
    });

    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move deal",
    };
  }
}

export async function deleteDealAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDealInDb(id);
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete deal",
    };
  }
}
