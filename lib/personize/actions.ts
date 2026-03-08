"use server";

import Anthropic from "@anthropic-ai/sdk";
import client from "./client";
import type {
  SmartGuidelinesResponse,
  SmartDigestResponse,
  SmartRecallResult,
  GenerateWithContextResult,
  PersonizeContextResult,
} from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function getSmartGuidelines(
  query: string
): Promise<SmartGuidelinesResponse | null> {
  try {
    const response = await client.ai.smartGuidelines({ message: query });
    return response.data ?? null;
  } catch (error) {
    console.error("[Personize] smartGuidelines failed:", error);
    return null;
  }
}

export async function generateWithPersonizeContext(
  prompt: string,
  contactQuery?: string
): Promise<GenerateWithContextResult> {
  const { guidelines, memories } = await assembleContext(
    prompt,
    contactQuery
  );

  const systemParts = [
    guidelines
      ? `## Guidelines\n${guidelines.compiledContext}`
      : "",
    memories
      ? `## Relevant Memories\n${memories.compiledContext}`
      : "",
  ].filter(Boolean);

  const systemPrompt = systemParts.join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return { text, personizeContext: { guidelines, memories } };
  } catch (error) {
    console.error("[Personize] generateWithPersonizeContext failed:", error);
    return { text: "", personizeContext: { guidelines, memories } };
  }
}

export async function memorize(
  content: string,
  tags: string[]
): Promise<boolean> {
  try {
    await client.memory.memorize({
      content,
      tags,
      enhanced: true,
    });
    return true;
  } catch (error) {
    console.error("[Personize] memorize failed:", error);
    return false;
  }
}

export async function smartRecall(
  query: string,
  options?: { email?: string; collectionIds?: string[] }
): Promise<SmartRecallResult | null> {
  try {
    const response = await client.memory.smartRecall({
      query,
      fast_mode: true,
      min_score: 0.3,
      ...options,
    });
    return response.data as SmartRecallResult | null;
  } catch (error) {
    console.error("[Personize] smartRecall failed:", error);
    return null;
  }
}

export async function smartDigest(
  query: string,
  options?: { email?: string; record_id?: string; token_budget?: number }
): Promise<SmartDigestResponse | null> {
  try {
    const { token_budget = 2000, ...rest } = options ?? {};
    const response = await client.memory.smartDigest({
      token_budget,
      include_properties: true,
      ...rest,
    });
    return response.data ?? null;
  } catch (error) {
    console.error("[Personize] smartDigest failed:", error);
    return null;
  }
}

export async function assembleContext(
  taskDescription: string,
  contactQuery?: string
): Promise<PersonizeContextResult> {
  const [guidelines, memories, recall] = await Promise.all([
    getSmartGuidelines(taskDescription),
    contactQuery
      ? smartDigest(taskDescription, { email: contactQuery })
      : Promise.resolve(null),
    smartRecall(taskDescription, contactQuery ? { email: contactQuery } : undefined),
  ]);

  return { guidelines, memories, recall };
}
