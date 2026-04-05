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
 *
 * Stricter refinements are applied on top of the base ingest schemas to reject
 * clearly malformed payloads earlier (e.g., empty-string emails, negative amounts).
 */

// ── Stricter base schemas ────────────────────────────────

const strictContactSchema = ingestContactSchema.refine(
  (d) => !d.email || d.email.trim().length > 0,
  { message: "Email must not be an empty string" },
);

const strictConversationSchema = ingestConversationSchema.refine(
  (d) => !d.contact_email || d.contact_email.trim().length > 0,
  { message: "Contact email must not be an empty string" },
);

const strictTaskSchema = ingestTaskSchema.refine(
  (d) => d.title.trim().length > 0,
  { message: "Task title must not be whitespace-only" },
);

const strictTransactionSchema = ingestTransactionSchema.refine(
  (d) => d.amount !== 0,
  { message: "Transaction amount must not be zero" },
);

// ── Contacts ─────────────────────────────────────────────

const n8nContactItem = z.union([
  strictContactSchema,
  z.object({ json: strictContactSchema }).transform((v) => v.json),
]);

export const n8nContactPayload = z.union([
  z.array(n8nContactItem),
  n8nContactItem.transform((v) => [v]),
]);

// ── Conversations ────────────────────────────────────────

const n8nConversationItem = z.union([
  strictConversationSchema,
  z.object({ json: strictConversationSchema }).transform((v) => v.json),
]);

export const n8nConversationPayload = z.union([
  z.array(n8nConversationItem),
  n8nConversationItem.transform((v) => [v]),
]);

// ── Tasks ────────────────────────────────────────────────

const n8nTaskItem = z.union([
  strictTaskSchema,
  z.object({ json: strictTaskSchema }).transform((v) => v.json),
]);

export const n8nTaskPayload = z.union([
  z.array(n8nTaskItem),
  n8nTaskItem.transform((v) => [v]),
]);

// ── Transactions ─────────────────────────────────────────

const n8nTransactionItem = z.union([
  strictTransactionSchema,
  z.object({ json: strictTransactionSchema }).transform((v) => v.json),
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
