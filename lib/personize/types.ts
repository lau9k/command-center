import type {
  SmartGuidelinesResponse as _SmartGuidelinesResponse,
  SmartDigestResponse as _SmartDigestResponse,
} from "@personize/sdk";

export type {
  PersonizeConfig,
  ApiResponse,
  SmartGuidelinesResponse,
  SmartGuidelinesSelection,
  SmartGuidelinesUsage,
  SmartGuidelinesAnalysis,
  SmartGuidelinesOptions,
  MemorizeOptions,
  SmartRecallOptions,
  SmartDigestOptions,
  SmartDigestResponse,
  SearchOptions,
  SearchResponse,
  MemoryItem,
  CollectionsResponse,
} from "@personize/sdk";

export interface PersonizeContextResult {
  guidelines: _SmartGuidelinesResponse | null;
  memories: _SmartDigestResponse | null;
  recall: SmartRecallResult | null;
}

export interface SmartRecallResult {
  success: boolean;
  records: Array<SmartRecallRecord>;
  answer?: string;
  /** @deprecated Use records instead. */
  memories?: Array<SmartRecallRecord>;
}

export interface SmartRecallRecord {
  recordId: string;
  displayName: string;
  score: number;
  completeness: number;
  freshness: number;
  properties: Record<string, string>;
  memories: string[];
}

/** @deprecated Use SmartRecallRecord instead. Kept for backward compatibility with components. */
export interface SmartRecallItem {
  id: string;
  text: string;
  relevance_tier: "direct" | "partial" | "might";
  topic?: string;
  timestamp?: string | null;
  score: number;
  type?: string;
}

/** Unified response from the SmartRecall / enrich API. */
export interface SmartRecallUnifiedResult {
  digest: string;
  properties: Record<string, string>;
  records: SmartRecallRecord[];
}

export interface SmartDigestResult {
  recordId: string;
  type: string;
  properties: Record<string, string>;
  memories: { id: string; text: string; createdAt: string }[];
  compiledContext: string;
  tokenEstimate: number;
  tokenBudget: number;
}

export interface GenerateWithContextResult {
  text: string;
  personizeContext: {
    guidelines: _SmartGuidelinesResponse | null;
    memories: _SmartDigestResponse | null;
  };
}

export interface MemorizeRequest {
  content: string;
  tags: string[];
  collectionId?: string;
}

export interface SyncStatsResult {
  synced: number;
  collections: Array<{
    collectionId: string;
    collectionName: string;
    count: number;
  }>;
}

export interface SyncContactMemoryStatsResult {
  synced: number;
  withMemories: number;
  total: number;
}

/** A contact record from the Personize Contact collection. */
export interface PersonizeContactRecord {
  recordId: string;
  type: string;
  properties: Record<string, string>;
}

/** Mapped contact from Personize, compatible with the app's Contact interface. */
export interface PersonizeContact {
  id: string;
  record_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  job_title: string | null;
  has_conversation: boolean;
  message_count: number;
  priority_score: number;
  last_interaction_date: string | null;
  memory_count: number | null;
  source: "linkedin";
  status: "active";
  tags: string[];
  score: number;
  notes: string | null;
  project_id: string;
  last_contact_date: string | null;
  merged_into_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSearchResult {
  contacts: PersonizeContact[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
