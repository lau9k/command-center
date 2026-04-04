import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import client from "@/lib/personize/client";

const batchEnrichSchema = z.object({
  recordIds: z
    .array(z.string().min(1, "Record ID must be non-empty"))
    .min(1, "At least one record ID is required")
    .max(50, "Maximum 50 record IDs per request"),
});

interface ContactProperties {
  full_name?: string;
  job_title?: string;
  company_name?: string;
  linkedin_url?: string;
  email?: string;
}

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchContactProperties(
  recordId: string
): Promise<ContactProperties | null> {
  try {
    const rawResponse = await (
      client as unknown as {
        smartRecallUnified: (data: {
          message: string;
          identifiers: { recordIds: string[] };
          responseDetail: string;
        }) => Promise<Record<string, unknown>>;
      }
    ).smartRecallUnified({
      message: `properties for contact ${recordId}`,
      identifiers: { recordIds: [recordId] },
      responseDetail: "full",
    });

    if (!rawResponse) return null;

    // Unwrap API envelope
    const unwrapped =
      rawResponse.data &&
      typeof rawResponse.data === "object" &&
      "records" in (rawResponse.data as Record<string, unknown>)
        ? (rawResponse.data as { records?: Array<{ properties?: Record<string, string>; displayName?: string; email?: string }> })
        : (rawResponse as unknown as { records?: Array<{ properties?: Record<string, string>; displayName?: string; email?: string }> });

    const record = unwrapped.records?.[0];
    if (!record) return null;

    const props = record.properties ?? {};
    const result: ContactProperties = {};

    const fullName = props.full_name ?? props.name ?? record.displayName;
    if (fullName) result.full_name = fullName;

    const jobTitle = props.job_title ?? props.title;
    if (jobTitle) result.job_title = jobTitle;

    const companyName = props.company_name ?? props.company;
    if (companyName) result.company_name = companyName;

    const linkedinUrl = props.linkedin_url ?? props.linkedin;
    if (linkedinUrl) result.linkedin_url = linkedinUrl;

    const email = record.email ?? props.email;
    if (email) result.email = email;

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error(
      `[API] batch-enrich: failed to fetch properties for ${recordId}:`,
      error
    );
    return null;
  }
}

export const POST = withErrorHandler(
  withAuth(async function POST(request, _user) {
    const body = await request.json();

    const parsed = batchEnrichSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { recordIds } = parsed.data;
    const properties: Record<string, ContactProperties> = {};

    for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
      if (i > 0) {
        await sleep(BATCH_DELAY_MS);
      }

      const batch = recordIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (recordId) => {
          const props = await fetchContactProperties(recordId);
          return { recordId, props };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.props) {
          properties[result.value.recordId] = result.value.props;
        }
      }
    }

    return NextResponse.json({ properties });
  })
);
