import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ContextDocForm } from "@/components/context-docs/ContextDocForm";
import type { ContextDocType } from "@/lib/personize/context-docs";
import { CONTEXT_DOC_TYPES } from "@/lib/personize/context-docs";

export const metadata: Metadata = { title: "New Context Doc" };

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function NewContextDocPage({ searchParams }: PageProps) {
  const { type } = await searchParams;

  const defaultType: ContextDocType | undefined =
    type && (CONTEXT_DOC_TYPES as readonly string[]).includes(type)
      ? (type as ContextDocType)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/context-docs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title="New Context Doc"
          description="Create a guideline, playbook, reference, template, or brief"
        />
      </div>

      <ContextDocForm defaultType={defaultType} />
    </div>
  );
}
