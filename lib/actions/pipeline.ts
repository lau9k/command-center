"use server";

import {
  getDealById,
  moveDealToStage,
  updateDeal,
  createDeal as createDealInDb,
} from "@/lib/api/pipeline";
import type { PipelineItem } from "@/lib/types/database";

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
  } as Partial<PipelineItem>);
}

export async function createDeal(
  data: Partial<PipelineItem>
): Promise<PipelineItem> {
  return createDealInDb(data);
}
