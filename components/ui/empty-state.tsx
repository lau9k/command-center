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
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[12px] border border-[#2A2A2A] bg-[#141414] px-8 py-16 text-center",
        className
      )}
      {...props}
    >
      {icon && <div className="text-[#666666] [&_svg]:size-12">{icon}</div>}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-[#FAFAFA]">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-[#A0A0A0]">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
