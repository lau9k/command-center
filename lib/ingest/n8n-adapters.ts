import { z } from "zod";
import {
  ingestContactSchema,
  ingestConversationSchema,
  ingestTaskSchema,
  ingestTransactionSchema,
} from "@/lib/validations";

/**
 * n8n sends webhook payloads wrapped in a `json` object (or as an array of
 * such objects when "Split In Batches" is used). These schemas accept both
 * the raw flat format and the n8n-wrapped format, normalising to the flat
 * dashboard shape. Accepts a single item or an array, always returning an array.
 */

// ── Contacts ─────────────────────────────────────────────

const n8nContactItem = z.union([
  ingestContactSchema,
  z.object({ json: ingestContactSchema }).transform((v) => v.json),
]);

export const n8nContactPayload = z.union([
  z.array(n8nContactItem),
  n8nContactItem.transform((v) => [v]),
]);

// ── Conversations ────────────────────────────────────────

const n8nConversationItem = z.union([
  ingestConversationSchema,
  z.object({ json: ingestConversationSchema }).transform((v) => v.json),
]);

export const n8nConversationPayload = z.union([
  z.array(n8nConversationItem),
  n8nConversationItem.transform((v) => [v]),
]);

// ── Tasks ────────────────────────────────────────────────

const n8nTaskItem = z.union([
  ingestTaskSchema,
  z.object({ json: ingestTaskSchema }).transform((v) => v.json),
]);

export const n8nTaskPayload = z.union([
  z.array(n8nTaskItem),
  n8nTaskItem.transform((v) => [v]),
]);

// ── Transactions ─────────────────────────────────────────

const n8nTransactionItem = z.union([
  ingestTransactionSchema,
  z.object({ json: ingestTransactionSchema }).transform((v) => v.json),
]);

export const n8nTransactionPayload = z.union([
  z.array(n8nTransactionItem),
  n8nTransactionItem.transform((v) => [v]),
]);

// ── Exported types ───────────────────────────────────────

export type N8nContactPayload = z.infer<typeof n8nContactPayload>;
export type N8nConversationPayload = z.infer<typeof n8nConversationPayload>;
export type N8nTaskPayload = z.infer<typeof n8nTaskPayload>;
export type N8nTransactionPayload = z.infer<typeof n8nTransactionPayload>;
