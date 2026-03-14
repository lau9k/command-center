"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown,
  Loader2,
  Save,
  Star,
  Trash2,
  Pencil,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { FilterCondition, SavedView } from "@/lib/filters";

const MAX_VIEWS = 10;

interface SavedViewsDropdownProps {
  entityType: string;
  currentFilters: FilterCondition[];
  activeView: SavedView | null;
  hasUnsavedChanges: boolean;
  onLoadView: (view: SavedView) => void;
  className?: string;
}

export function SavedViewsDropdown({
  entityType,
  currentFilters,
  activeView,
  hasUnsavedChanges,
  onLoadView,
  className,
}: SavedViewsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavedView | null>(null);
  const hasFetched = useRef(false);

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/saved-views?entity_type=${encodeURIComponent(entityType)}`
      );
      if (res.ok) {
        const json = await res.json();
        const allViews: SavedView[] = json.data ?? [];
        setViews(allViews.slice(0, MAX_VIEWS));
      }
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true;
      fetchViews();
    }
  }, [open, fetchViews]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          entity_type: entityType,
          filters: currentFilters,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setSaveName("");
        setShowSave(false);
        hasFetched.current = false;
        await fetchViews();
        if (json.data) {
          onLoadView(json.data);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/saved-views/${deleteTarget.id}`, { method: "DELETE" });
    setViews((v) => v.filter((view) => view.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/saved-views/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setViews((v) =>
        v.map((view) =>
          view.id === id ? { ...view, name: editName.trim() } : view
        )
      );
    }
    setEditingId(null);
    setEditName("");
  }

  async function handleSetDefault(view: SavedView) {
    const res = await fetch(`/api/saved-views/${view.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: !view.is_default }),
    });
    if (res.ok) {
      hasFetched.current = false;
      await fetchViews();
    }
  }

  const buttonLabel = activeView ? activeView.name : "Views";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
            <ChevronDown className="size-4" />
            <span className="max-w-[120px] truncate">{buttonLabel}</span>
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1 text-amber-500" title="Unsaved changes">
                <AlertCircle className="size-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            Saved Views
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : views.length === 0 && !showSave ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No saved views yet
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {views.map((view) => (
                <div
                  key={view.id}
                  className={cn(
                    "group flex items-center gap-1 px-3 py-2 transition-colors hover:bg-accent",
                    activeView?.id === view.id && "bg-accent/50"
                  )}
                >
                  {editingId === view.id ? (
                    <form
                      className="flex flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRename(view.id);
                      }}
                    >
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded p-1 hover:bg-accent"
                        disabled={!editName.trim()}
                      >
                        <Check className="size-3 text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onLoadView(view);
                          setOpen(false);
                        }}
                        className="flex-1 text-left text-sm truncate"
                      >
                        {view.name}
                        {view.is_default && (
                          <Star className="ml-1 inline size-3 fill-current text-yellow-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(view.id);
                          setEditName(view.name);
                        }}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                        title="Rename"
                      >
                        <Pencil className="size-3 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDefault(view)}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                        title={view.is_default ? "Remove default" : "Set as default"}
                      >
                        <Star
                          className={cn(
                            "size-3",
                            view.is_default
                              ? "fill-current text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(view)}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="size-3 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t p-2">
            {showSave ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  autoFocus
                  placeholder="View name..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !saveName.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSave(false);
                    setSaveName("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setShowSave(true)}
                disabled={currentFilters.length === 0}
              >
                <Save className="size-3" />
                Save current filters as view
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
