import { z } from "zod";

// ── Resource Types ──────────────────────────────────────────

export type ResourceType = "pdf" | "docx" | "xlsx" | "md" | "pptx" | "png" | "jpg" | "csv" | "other";
export type ResourceStatus = "active" | "archived";

export interface Resource {
  id: string;
  user_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: ResourceType;
  file_size: number | null;
  tags: string[];
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

// ── Zod Schemas ─────────────────────────────────────────────

export const createResourceSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  file_url: z.string().max(2000).optional().nullable(),
  file_type: z.enum(["pdf", "docx", "xlsx", "md", "pptx", "png", "jpg", "csv", "other"]).optional(),
  file_size: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  status: z.enum(["active", "archived"]).optional(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateResourceSchema = createResourceSchema.partial();

export type ResourceCreate = z.infer<typeof createResourceSchema>;
export type ResourceUpdate = z.infer<typeof updateResourceSchema>;

// ── Filter Types ────────────────────────────────────────────

export interface ResourceFilter {
  search: string;
  fileType: string;
  projectId: string;
  sort: "newest" | "oldest" | "name" | "type";
}
