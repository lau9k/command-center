import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/design-tokens"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// --- Status Badge ---

type StatusType = "draft" | "ready" | "scheduled" | "published" | "failed"

const statusColors: Record<StatusType, string> = {
  draft: statusBadgeClass.draft,
  ready: statusBadgeClass.ready,
  scheduled: statusBadgeClass.scheduled,
  published: statusBadgeClass.published,
  failed: statusBadgeClass.failed,
}

function StatusBadge({
  status,
  className,
  ...props
}: React.ComponentProps<"span"> & { status: StatusType }) {
  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusColors[status],
        className
      )}
      {...props}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// --- Priority Badge ---

type PriorityType = "low" | "medium" | "high" | "urgent"

const priorityColors: Record<PriorityType, string> = {
  low: statusBadgeClass.draft,
  medium: statusBadgeClass.ready,
  high: "bg-[#F97316]/20 text-[#F97316]",
  urgent: statusBadgeClass.failed,
}

function PriorityBadge({
  priority,
  className,
  ...props
}: React.ComponentProps<"span"> & { priority: PriorityType }) {
  return (
    <span
      data-slot="priority-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        priorityColors[priority],
        className
      )}
      {...props}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

// --- Platform Badge ---

type PlatformType = "linkedin" | "twitter" | "youtube" | "instagram" | "tiktok" | "telegram"

const platformColors: Record<PlatformType, { bg: string; text: string }> = {
  linkedin: { bg: "bg-[#0A66C2]/20", text: "text-[#0A66C2]" },
  twitter: { bg: "bg-[#1DA1F2]/20", text: "text-[#1DA1F2]" },
  youtube: { bg: "bg-[#FF0000]/20", text: "text-[#FF0000]" },
  instagram: { bg: "bg-[#E1306C]/20", text: "text-[#E1306C]" },
  tiktok: { bg: "bg-[#00F2EA]/20", text: "text-[#00F2EA]" },
  telegram: { bg: "bg-[#0088CC]/20", text: "text-[#0088CC]" },
}

const platformLabels: Record<PlatformType, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
}

function PlatformBadge({
  platform,
  className,
  ...props
}: React.ComponentProps<"span"> & { platform: PlatformType }) {
  const c = platformColors[platform]
  return (
    <span
      data-slot="platform-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        className
      )}
      {...props}
    >
      {platformLabels[platform]}
    </span>
  )
}

// --- Project Badge ---

function ProjectBadge({
  className,
  children,
  color = "#A855F7",
  ...props
}: React.ComponentProps<"span"> & { color?: string }) {
  return (
    <span
      data-slot="project-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: `${color}20`, color }}
      {...props}
    >
      {children}
    </span>
  )
}

export {
  Badge,
  badgeVariants,
  StatusBadge,
  PriorityBadge,
  PlatformBadge,
  ProjectBadge,
}
export type { StatusType, PriorityType, PlatformType }
