import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/personize/client";
import { z } from "zod";

const GOVERNANCE_COLLECTION_ID =
  process.env.PERSONIZE_GOVERNANCE_COLLECTION_ID ?? "governance-variables";

const GOVERNANCE_TAG = "governance";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.API_SECRET;
}

// ── Validation ───────────────────────────────────────────

const governanceVariableSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  triggerKeywords: z.array(z.string().max(100)).default([]),
  category: z
    .enum([
      "brand_voice",
      "icp_definition",
      "outreach_playbook",
      "competitor_policy",
      "custom",
    ])
    .default("custom"),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

// ── Types ────────────────────────────────────────────────

export interface GovernanceVariable {
  id: string;
  name: string;
  content: string;
  triggerKeywords: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

// ── GET: list governance variables ───────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const message = "governance variables brand voice ICP playbook competitor policy";
    const response = await client.memory.retrieve({
      message,
      mode: "fast",
    });

    const data = response.data as {
      memories?: Array<{
        id?: string;
        text?: string;
        tags?: string[];
        metadata?: Record<string, string>;
        createdAt?: string;
        timestamp?: string;
      }>;
    } | null;

    const memories = data?.memories ?? [];

    const variables: GovernanceVariable[] = memories
      .filter((m) => m.tags?.includes(GOVERNANCE_TAG))
      .map((m) => {
        const tags = m.tags ?? [];
        const text = m.text ?? "";

        // Parse name from tag or content header
        const nameTag = tags.find((t) => t.startsWith("governance-name:"));
        const nameFromHeader = text.match(/^#\s+(.+)$/m)?.[1];
        const name = nameTag
          ? nameTag.replace("governance-name:", "")
          : nameFromHeader ?? "Untitled";

        // Parse category from tag
        const categoryTag = tags.find(
          (t) => t.startsWith("governance:") && !t.startsWith("governance-name:")
        );
        const category = categoryTag
          ? categoryTag.replace("governance:", "")
          : "custom";

        // Parse trigger keywords from content or tags
        const keywordsLine = text.match(/^Trigger Keywords:\s*(.+)$/m)?.[1];
        const triggerKeywords = keywordsLine
          ? keywordsLine.split(",").map((k) => k.trim()).filter(Boolean)
          : tags.filter(
              (t) =>
                t !== GOVERNANCE_TAG &&
                !t.startsWith("governance:") &&
                !t.startsWith("governance-name:")
            );

        // Strip metadata lines from content for display
        const contentLines = text.split("\n");
        const bodyStartIndex = contentLines.findIndex(
          (line, i) =>
            i > 0 &&
            line.trim() === "" &&
            !contentLines[i - 1]?.startsWith("Category:") &&
            !contentLines[i - 1]?.startsWith("Trigger Keywords:") &&
            !contentLines[i - 1]?.startsWith("Updated:")
        );
        const bodyContent =
          bodyStartIndex >= 0
            ? contentLines.slice(bodyStartIndex + 1).join("\n").trim()
            : text;

        return {
          id: m.id ?? crypto.randomUUID(),
          name,
          content: bodyContent,
          triggerKeywords,
          category,
          createdAt: m.createdAt ?? m.timestamp ?? new Date().toISOString(),
          updatedAt: m.createdAt ?? m.timestamp ?? new Date().toISOString(),
        };
      });

    return NextResponse.json({ success: true, data: variables });
  } catch (error) {
    console.error("[API] /api/personize/governance GET failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST: create or update a governance variable ─────────

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = governanceVariableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, content, triggerKeywords, category } = parsed.data;

    // Encode metadata into the content since MemorizeOptions doesn't support metadata
    const formattedContent = [
      `# ${name}`,
      `Category: ${category}`,
      triggerKeywords.length > 0
        ? `Trigger Keywords: ${triggerKeywords.join(", ")}`
        : "",
      `Updated: ${new Date().toISOString()}`,
      "",
      content,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.memory.save({
      content: formattedContent,
      collectionIds: [GOVERNANCE_COLLECTION_ID],
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    console.error("[API] /api/personize/governance POST failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── DELETE: remove a governance variable ─────────────────

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const memoryClient = client.memory as typeof client.memory & {
      delete: (opts: { memoryId: string }) => Promise<unknown>;
    };
    await memoryClient.delete({ memoryId: parsed.data.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] /api/personize/governance DELETE failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
