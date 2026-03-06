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
  memories: Array<{
    text: string;
    score?: number;
    metadata?: Record<string, unknown>;
  }>;
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
