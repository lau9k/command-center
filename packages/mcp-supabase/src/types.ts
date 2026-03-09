export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ContactStatus = "active" | "inactive" | "lead" | "customer";
export type ContactSource = "manual" | "referral" | "website" | "linkedin" | "other";
export type ContentPostStatus = "draft" | "ready" | "scheduled" | "published" | "failed";

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ToolResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  count?: number;
}
