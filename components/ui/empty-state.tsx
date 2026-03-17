import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode | LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  /** Shorthand: button label (alternative to `action` object) */
  actionLabel?: string
  /** Optional href — renders the action as a Link instead of a button */
  actionHref?: string
  /** Shorthand: button click handler (alternative to `action` object) */
  onAction?: () => void
}

function EmptyState({ icon, title, description, action, actionLabel, actionHref, onAction, className, ...props }: EmptyStateProps) {
  const resolvedAction = action ?? (actionLabel ? { label: actionLabel, onClick: onAction } : undefined)

  // If icon is a Lucide component (function), render it; otherwise treat as ReactNode
  const renderedIcon = typeof icon === "function"
    ? React.createElement(icon as LucideIcon)
    : icon

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center",
        className
      )}
      {...props}
    >
      {renderedIcon && <div className="text-muted-foreground/50 [&_svg]:size-12">{renderedIcon}</div>}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {resolvedAction && (
        actionHref ? (
          <Button asChild className="mt-2">
            <Link href={actionHref}>{resolvedAction.label}</Link>
          </Button>
        ) : resolvedAction.onClick ? (
          <Button onClick={resolvedAction.onClick} className="mt-2">
            {resolvedAction.label}
          </Button>
        ) : null
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
