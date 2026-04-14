import { PERSONIZE_API_BASE, PERSONIZE_API_KEY } from "./config";

// ── Types ────────────────────────────────────────────────

export const CONTEXT_DOC_TYPES = [
  "guideline",
  "playbook",
  "reference",
  "template",
  "brief",
] as const;

export type ContextDocType = (typeof CONTEXT_DOC_TYPES)[number];

export interface ContextDoc {
  id: string;
  type: ContextDocType;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContextDocListResponse {
  success: boolean;
  docs: ContextDoc[];
}

export interface ContextDocSaveResponse {
  success: boolean;
  doc: ContextDoc;
}

export interface ContextDocDeleteResponse {
  success: boolean;
}

// ── Helpers ──────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${PERSONIZE_API_KEY}`,
  };
}

/** List all context docs. */
export async function listContextDocs(): Promise<ContextDocListResponse> {
  const res = await fetch(`${PERSONIZE_API_BASE}/api/v1/context/manage/list`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({}),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Personize list failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ContextDocListResponse>;
}

/** Get a single context doc by id. */
export async function getContextDoc(id: string): Promise<ContextDoc | null> {
  const res = await fetch(`${PERSONIZE_API_BASE}/api/v1/context/manage/get`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ id }),
    next: { revalidate: 30 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Personize get failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { doc: ContextDoc };
  return data.doc;
}

/** Create or update a context doc (upsert by id). */
export async function saveContextDoc(payload: {
  id?: string;
  type: ContextDocType;
  title: string;
  content: string;
  tags?: string[];
}): Promise<ContextDocSaveResponse> {
  const res = await fetch(`${PERSONIZE_API_BASE}/api/v1/context/save`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Personize save failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ContextDocSaveResponse>;
}

/** Delete a context doc by id. */
export async function deleteContextDoc(
  id: string
): Promise<ContextDocDeleteResponse> {
  const res = await fetch(
    `${PERSONIZE_API_BASE}/api/v1/context/manage/delete`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ id }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Personize delete failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ContextDocDeleteResponse>;
}
