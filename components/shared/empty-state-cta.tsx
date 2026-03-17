"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface EmptyStateCTAAction {
  label: string
  onClick: () => void
}

interface EmptyStateCTAProps extends React.ComponentProps<"div"> {
  icon: LucideIcon
  title: string
  description: string
  primaryAction: EmptyStateCTAAction
  secondaryAction?: EmptyStateCTAAction
}

function EmptyStateCTA({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: EmptyStateCTAProps) {
  return (
    <div
      data-slot="empty-state-cta"
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card px-8 py-20 text-center",
        className,
      )}
      {...props}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}

export { EmptyStateCTA }
export type { EmptyStateCTAProps, EmptyStateCTAAction }
