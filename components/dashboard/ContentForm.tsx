"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

export interface ContentFormData {
  title: string;
  body: string;
  platform: string;
  status: ContentPostStatus;
  scheduled_for: string | null;
  image_url: string;
}

interface ContentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ContentPost | null;
  onSubmit: (data: ContentFormData, postId?: string) => void;
}

const emptyForm: ContentFormData = {
  title: "",
  body: "",
  platform: "linkedin",
  status: "draft",
  scheduled_for: null,
  image_url: "",
};

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter/X" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
] as const;

export function ContentForm({
  open,
  onOpenChange,
  post,
  onSubmit,
}: ContentFormProps) {
  const [form, setForm] = useState<ContentFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isEditing = !!post;

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title ?? "",
        body: post.body ?? post.caption ?? "",
        platform: post.platform ?? "linkedin",
        status: post.status,
        scheduled_for: post.scheduled_for ?? post.scheduled_for ?? null,
        image_url: post.image_url ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [post, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() && !form.body.trim()) return;

    setSaving(true);
    try {
      onSubmit(form, post?.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Post" : "New Post"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the post details below."
              : "Fill in the details to create a new post."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-6">
          <div className="grid gap-2">
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              placeholder="Post title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="post-body">Body</Label>
            <Textarea
              id="post-body"
              placeholder="Write your post content..."
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="post-image-url">Image URL</Label>
            <Input
              id="post-image-url"
              type="url"
              placeholder="https://example.com/image.png"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm({ ...form, platform: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as ContentPostStatus })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.scheduled_for && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {form.scheduled_for
                    ? format(new Date(form.scheduled_for), "MMM d, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    form.scheduled_for
                      ? new Date(form.scheduled_for)
                      : undefined
                  }
                  onSelect={(date) =>
                    setForm({
                      ...form,
                      scheduled_for: date ? date.toISOString() : null,
                    })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={saving || (!form.title.trim() && !form.body.trim())}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Post"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
