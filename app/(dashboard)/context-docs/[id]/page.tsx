import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextDocForm } from "@/components/context-docs/ContextDocForm";
import { MarkdownRenderer } from "@/components/context-docs/MarkdownRenderer";
import { getContextDoc } from "@/lib/personize/context-docs";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const doc = await getContextDoc(id).catch(() => null);
  return { title: doc ? doc.title : "Context Doc" };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ContextDocDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { edit } = await searchParams;

  const doc = await getContextDoc(id).catch(() => null);
  if (!doc) notFound();

  const isEditing = edit === "true";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/context-docs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={doc.title}
          description={`${doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} · Last updated ${formatDateTime(doc.updated_at)}`}
          actions={
            !isEditing ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/context-docs/${doc.id}?edit=true`}>
                  <Pencil className="mr-1 size-4" />
                  Edit
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>

      {isEditing ? (
        <ContextDocForm doc={doc} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
            </Badge>
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-6">
            <MarkdownRenderer content={doc.content} />
          </div>

          <p className="text-xs text-muted-foreground">
            Created {formatDateTime(doc.created_at)} · Updated{" "}
            {formatDateTime(doc.updated_at)}
          </p>
        </div>
      )}
    </div>
  );
}
