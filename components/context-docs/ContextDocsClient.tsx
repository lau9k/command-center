"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type {
  ContextDoc,
  ContextDocType,
} from "@/lib/personize/context-docs";
import { CONTEXT_DOC_TYPES } from "@/lib/personize/context-docs";

interface ContextDocsClientProps {
  docs: ContextDoc[];
  error?: string | null;
}

const TYPE_LABELS: Record<ContextDocType, string> = {
  guideline: "Guidelines",
  playbook: "Playbooks",
  reference: "References",
  template: "Templates",
  brief: "Briefs",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ContextDocsClient({ docs, error }: ContextDocsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grouped = CONTEXT_DOC_TYPES.reduce(
    (acc, type) => {
      acc[type] = docs.filter((d) => d.type === type);
      return acc;
    },
    {} as Record<ContextDocType, ContextDoc[]>
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/context-docs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Delete failed" }));
        toast.error((data as { error?: string }).error ?? "Delete failed");
        return;
      }
      toast.success("Context doc deleted");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to delete context doc");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load Context Docs: {error}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing cached data if available. The Personize API may be
          temporarily unavailable.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="guideline">
      <TabsList variant="line" className="w-full justify-start">
        {CONTEXT_DOC_TYPES.map((type) => (
          <TabsTrigger key={type} value={type} className="gap-1.5">
            {TYPE_LABELS[type]}
            <Badge
              variant="secondary"
              className="ml-1 px-1.5 py-0 text-xs font-normal"
            >
              {grouped[type].length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {CONTEXT_DOC_TYPES.map((type) => (
        <TabsContent key={type} value={type}>
          {grouped[type].length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No {TYPE_LABELS[type].toLowerCase()} yet
              </p>
              <Button asChild size="sm">
                <Link href={`/context-docs/new?type=${type}`}>
                  <Plus className="mr-1 size-4" />
                  Create {TYPE_LABELS[type].slice(0, -1)}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[type].map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/context-docs/${doc.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{doc.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(doc.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              disabled={deletingId === doc.id || isPending}
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &ldquo;{doc.title}&rdquo;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The context doc will be
                                permanently removed from Personize.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
