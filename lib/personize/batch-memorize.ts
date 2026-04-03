import client from "./client";

export interface BatchContact {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  source?: string | null;
}

export interface BatchProgress {
  total: number;
  processed: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
}

export interface BatchError {
  batchIndex: number;
  contactIndices: number[];
  error: string;
}

export interface BatchMemorizeResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: BatchError[];
}

const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 500;

function getContactsCollectionId(): string {
  const id = process.env.PERSONIZE_CONTACTS_COLLECTION_ID;
  if (!id) {
    throw new Error("PERSONIZE_CONTACTS_COLLECTION_ID environment variable is required");
  }
  return id;
}

const COLLECTION_NAME = "Contacts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert BatchContact rows into the format expected by memorizeBatch.
 * Each row is a flat key-value object with source field names.
 */
function contactToRow(contact: BatchContact): Record<string, unknown> {
  const fullName =
    contact.name ??
    (`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || null);

  const location =
    [contact.city, contact.country].filter(Boolean).join(", ") || null;

  return {
    email: contact.email ?? "",
    full_name: fullName ?? "",
    job_title: contact.job_title ?? "",
    company_name: contact.company_name ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    website: contact.website ?? "",
    phone: contact.phone ?? "",
    industry: contact.industry ?? "",
    location: location ?? "",
    source: contact.source ?? "csv-import",
  };
}

function buildMapping() {
  const prop = (sourceField: string, extractMemories = false) => ({
    sourceField,
    collectionId: getContactsCollectionId(),
    collectionName: COLLECTION_NAME,
    extractMemories,
  });

  return {
    entityType: "contact",
    email: "email",
    properties: {
      email: prop("email"),
      full_name: prop("full_name"),
      job_title: prop("job_title"),
      company_name: prop("company_name"),
      linkedin_url: prop("linkedin_url"),
      website: prop("website"),
      phone: prop("phone"),
      industry: prop("industry"),
      location: prop("location"),
      source: prop("source"),
    },
  };
}

/**
 * Batch-memorize contacts using Personize's memorizeBatch API.
 * Chunks contacts into batches of 50, with 500ms rate limiting between batches.
 */
export async function batchMemorize(
  contacts: BatchContact[],
  _filename: string,
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchMemorizeResult> {
  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
  const mapping = buildMapping();
  let succeeded = 0;
  let failed = 0;
  const errors: BatchError[] = [];

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const chunk = contacts.slice(start, start + BATCH_SIZE);
    const rows = chunk.map((c) => contactToRow(c));

    try {
      await client.memory.memorizeBatch({
        source: "csv-import",
        mapping,
        rows,
      });
      succeeded += chunk.length;
    } catch (err) {
      failed += chunk.length;
      const indices = chunk.map((_, i) => start + i);
      errors.push({
        batchIndex: batchIdx,
        contactIndices: indices,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    onProgress?.({
      total: contacts.length,
      processed: succeeded + failed,
      failed,
      currentBatch: batchIdx + 1,
      totalBatches,
    });

    // Rate limit between batches (skip after last)
    if (batchIdx < totalBatches - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  return { total: contacts.length, succeeded, failed, errors };
}
