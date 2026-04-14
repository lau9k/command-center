import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ContextDocsClient } from "@/components/context-docs/ContextDocsClient";
import { listContextDocs } from "@/lib/personize/context-docs";
import type { ContextDoc } from "@/lib/personize/context-docs";

export const metadata: Metadata = { title: "Context Docs" };
export const dynamic = "force-dynamic";

export default async function ContextDocsPage() {
  let docs: ContextDoc[] = [];
  let error: string | null = null;

  try {
    const result = await listContextDocs();
    docs = result.docs;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
    console.error("[ContextDocs] list failed:", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Context Docs"
        description="Manage guidelines, playbooks, references, templates, and briefs"
        actions={
          <Button asChild>
            <Link href="/context-docs/new">
              <Plus className="mr-1 size-4" />
              New Doc
            </Link>
          </Button>
        }
      />

      <ContextDocsClient docs={docs} error={error} />
    </div>
  );
}
