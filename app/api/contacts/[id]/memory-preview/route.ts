import { NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { isPersonizeId } from "@/lib/personize/id-guard";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    if (!process.env.PERSONIZE_SECRET_KEY) {
      return NextResponse.json({ snippet: null });
    }

    const { id } = await context!.params;

    if (isPersonizeId(id)) {
      return NextResponse.json({ snippet: null });
    }

    const supabase = createServiceClient();
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("email, name")
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ snippet: null });
    }

    if (!contact.email) {
      return NextResponse.json({ snippet: null });
    }

    try {
      const result = await smartRecall(contact.name, {
        email: contact.email,
        responseDetail: "summary",
      });

      if (!result?.records?.length) {
        return NextResponse.json({ snippet: null });
      }

      const top = result.records[0];
      // Runtime shape may include text/context (unified API) or memories[] (typed)
      const rec = top as unknown as Record<string, unknown>;
      const rawSnippet =
        (Array.isArray(top.memories) && top.memories.length > 0
          ? top.memories[0]
          : null) ??
        (typeof rec.text === "string" ? rec.text : null) ??
        (typeof rec.context === "string" ? rec.context : null) ??
        result.answer ??
        null;

      if (!rawSnippet) {
        return NextResponse.json({ snippet: null });
      }

      const snippet =
        rawSnippet.length > 150 ? rawSnippet.slice(0, 147) + "…" : rawSnippet;

      return NextResponse.json({
        snippet,
        score: top.score ?? null,
        cached: false,
      });
    } catch (err) {
      console.error("[API] /api/contacts/[id]/memory-preview failed:", err);
      return NextResponse.json({ snippet: null });
    }
  })
);
