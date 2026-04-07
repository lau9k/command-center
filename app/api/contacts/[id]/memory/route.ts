import { NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { isPersonizeId } from "@/lib/personize/id-guard";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    if (!process.env.PERSONIZE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Personize not configured" },
        { status: 503 }
      );
    }

    const { id } = await context!.params;

    if (isPersonizeId(id)) {
      return NextResponse.json({
        data: {
          records: [],
          answer: null,
        },
      });
    }

    const supabase = createServiceClient();
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("email, name")
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }
    const contactName = contact.name;
    const contactEmail: string | null = contact.email;

    if (!contactEmail) {
      return NextResponse.json(
        { error: "Contact has no email — cannot query Personize" },
        { status: 422 }
      );
    }

    try {
      const result = await smartRecall(contactName, {
        ...(contactEmail ? { email: contactEmail } : {}),
      });

      return NextResponse.json({
        data: {
          records: Array.isArray(result?.records) ? result.records : [],
          answer: result?.answer ?? null,
        },
      });
    } catch (err) {
      console.error("[API] /api/contacts/[id]/memory failed:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })
);
