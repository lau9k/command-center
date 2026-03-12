"use client";

import { cn } from "@/lib/utils";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/types/database";
import { Heart, MessageCircle, Repeat2, Share, ThumbsUp, Send } from "lucide-react";

interface PlatformPreviewProps {
  platform: "linkedin" | "twitter";
  body: string;
  imageUrl?: string;
}

function TwitterPreview({ body, imageUrl }: { body: string; imageUrl?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex gap-3">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">Your Name</span>
            <span className="text-sm text-muted-foreground">@handle</span>
            <span className="text-sm text-muted-foreground">&middot; now</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {body || "Your post content will appear here..."}
          </p>
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Post media" className="w-full object-cover max-h-72" />
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-muted-foreground">
            <button type="button" className="flex items-center gap-1.5 text-xs hover:text-[#1DA1F2]">
              <MessageCircle className="size-4" />
              <span>0</span>
            </button>
            <button type="button" className="flex items-center gap-1.5 text-xs hover:text-[#22C55E]">
              <Repeat2 className="size-4" />
              <span>0</span>
            </button>
            <button type="button" className="flex items-center gap-1.5 text-xs hover:text-[#EF4444]">
              <Heart className="size-4" />
              <span>0</span>
            </button>
            <button type="button" className="flex items-center gap-1.5 text-xs hover:text-[#1DA1F2]">
              <Share className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ body, imageUrl }: { body: string; imageUrl?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 rounded-full bg-muted" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your Name</p>
            <p className="text-xs text-muted-foreground">Your headline</p>
            <p className="text-xs text-muted-foreground">Just now</p>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
          {body || "Your post content will appear here..."}
        </p>
      </div>
      {imageUrl && (
        <div className="border-t border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Post media" className="w-full object-cover max-h-72" />
        </div>
      )}
      <div className="flex items-center justify-around border-t border-border px-2 py-2">
        <button type="button" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <ThumbsUp className="size-4" />
          Like
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <MessageCircle className="size-4" />
          Comment
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <Repeat2 className="size-4" />
          Repost
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <Send className="size-4" />
          Send
        </button>
      </div>
    </div>
  );
}

export function PlatformPreview({ platform, body, imageUrl }: PlatformPreviewProps) {
  const color = PLATFORM_COLORS[platform] ?? "#666";
  const label = PLATFORM_LABELS[platform] ?? platform;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label} Preview
        </span>
      </div>
      {platform === "twitter" ? (
        <TwitterPreview body={body} imageUrl={imageUrl} />
      ) : (
        <LinkedInPreview body={body} imageUrl={imageUrl} />
      )}
    </div>
  );
}

interface PlatformCharacterCountProps {
  length: number;
  platform: string;
}

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  telegram: 4096,
  youtube: 5000,
  facebook: 63206,
  bluesky: 300,
  reddit: 40000,
};

export function PlatformCharacterCount({ length, platform }: PlatformCharacterCountProps) {
  const limit = PLATFORM_CHAR_LIMITS[platform] ?? 280;
  const isOver = length > limit;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        isOver ? "text-[#EF4444] font-medium" : "text-muted-foreground"
      )}
    >
      {length}/{limit}
    </span>
  );
}
