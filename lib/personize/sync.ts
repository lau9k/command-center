import { memorize } from "./actions";

export interface SyncDealContext {
  company_name: string;
  amount: number | null;
  stage_name: string;
  notes: string | null;
  contact_email: string | null;
}

/**
 * Sync a pipeline deal's context to Personize via the memorize helper.
 * Fire-and-forget — never throws.
 */
export async function syncToPersonize(context: SyncDealContext): Promise<boolean> {
  try {
    const content = JSON.stringify(context);
    const tags = ["pipeline", "deal-stage-change", context.stage_name];

    return await memorize(content, tags, context.contact_email ?? undefined);
  } catch (error) {
    console.error("[Personize] syncToPersonize failed:", error);
    return false;
  }
}
