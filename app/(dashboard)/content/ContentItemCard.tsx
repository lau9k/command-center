"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformBadge, StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ContentItem,
  ContentItemPlatform,
  ContentItemBrand,
  ContentItemStatus,
} from "@/lib/types/database";

const BRAND_COLORS: Record<ContentItemBrand, string> = {
  meek: "bg-[#A855F7]/20 text-[#A855F7]",
  personize: "bg-[#3B82F6]/20 text-[#3B82F6]",
  buildervault: "bg-[#22C55E]/20 text-[#22C55E]",
  telco: "bg-[#F97316]/20 text-[#F97316]",
  personal: "bg-[#EAB308]/20 text-[#EAB308]",
};

const BRAND_LABELS: Record<ContentItemBrand, string> = {
  meek: "Meek",
  personize: "Personize",
  buildervault: "BuilderVault",
  telco: "Telco",
  personal: "Personal",
};

const STATUS_MAP: Record<ContentItemStatus, "draft" | "scheduled" | "published" | "failed"> = {
  draft: "draft",
  scheduled: "scheduled",
  published: "published",
  failed: "failed",
};

interface ContentItemCardProps {
  item: ContentItem;
  onUpdate: (id: string, fields: Partial<ContentItem>) => void;
  onPublish: (id: string) => void;
  onDelete: (item: ContentItem) => void;
  publishing?: boolean;
}

export function ContentItemCard({
  item,
  onUpdate,
  onPublish,
  onDelete,
  publishing,
}: ContentItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editBody, setEditBody] = useState(item.body);
  const [editPlatform, setEditPlatform] = useState(item.platform);
  const [editBrand, setEditBrand] = useState(item.brand);
  const [saving, setSaving] = useState(false);

  const bodyPreview =
    item.body.length > 100 ? item.body.slice(0, 100) + "..." : item.body;

  const isDirty =
    editBody !== item.body ||
    editPlatform !== item.platform ||
    editBrand !== item.brand;

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onUpdate(item.id, {
        body: editBody,
        platform: editPlatform,
        brand: editBrand,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditBody(item.body);
    setEditPlatform(item.platform);
    setEditBrand(item.brand);
    setExpanded(false);
  }

  const canPublish = item.status === "draft" || item.status === "failed";

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        expanded ? "bg-card" : "hover:bg-accent/50"
      )}
    >
      {/* Collapsed row */}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <PlatformBadge platform={item.platform} />

        <p className="min-w-0 flex-1 truncate text-sm">{bodyPreview}</p>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              BRAND_COLORS[item.brand]
            )}
          >
            {BRAND_LABELS[item.brand]}
          </span>

          <StatusBadge status={STATUS_MAP[item.status]} />

          {item.scheduled_for && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              {format(new Date(item.scheduled_for), "MMM d, h:mm a")}
            </span>
          )}

          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded inline editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="resize-y"
            placeholder="Post content..."
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Platform
              </label>
              <Select
                value={editPlatform}
                onValueChange={(v) =>
                  setEditPlatform(v as ContentItemPlatform)
                }
              >
                <SelectTrigger size="sm" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="bluesky">Bluesky</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Brand
              </label>
              <Select
                value={editBrand}
                onValueChange={(v) => setEditBrand(v as ContentItemBrand)}
              >
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meek">Meek</SelectItem>
                  <SelectItem value="personize">Personize</SelectItem>
                  <SelectItem value="buildervault">BuilderVault</SelectItem>
                  <SelectItem value="telco">Telco</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.tone && (
              <span className="text-xs text-muted-foreground">
                Tone: {item.tone}
              </span>
            )}

            {item.narrative_arc_chapter && (
              <span className="text-xs text-muted-foreground">
                Arc: {item.narrative_arc_chapter}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDirty && (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canPublish && (
                <Button
                  size="sm"
                  onClick={() => onPublish(item.id)}
                  disabled={publishing}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  {publishing ? "Publishing..." : "Publish to Late.so"}
                </Button>
              )}
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onDelete(item)}
                aria-label="Delete content item"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
