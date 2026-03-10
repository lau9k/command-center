import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  /** Shorthand: button label (alternative to `action` object) */
  actionLabel?: string
  /** Shorthand: button click handler (alternative to `action` object) */
  onAction?: () => void
}

function EmptyState({ icon, title, description, action, actionLabel, onAction, className, ...props }: EmptyStateProps) {
  const resolvedAction = action ?? (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined)
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center",
        className
      )}
      {...props}
    >
      {icon && <div className="text-text-muted [&_svg]:size-12">{icon}</div>}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {resolvedAction && (
        <Button onClick={resolvedAction.onClick} className="mt-2">
          {resolvedAction.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
