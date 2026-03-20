import * as React from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface KpiCardProps extends React.ComponentProps<"div"> {
  label: string
  value: string | number
  subtitle?: string
  delta?: number
  deltaDirection?: "up" | "down"
  icon?: React.ReactNode
  sparkline?: React.ReactNode
  accentColor?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

function KpiCard({
  label,
  value,
  subtitle,
  delta,
  deltaDirection,
  icon,
  sparkline,
  accentColor,
  onClick,
  className,
  ...props
}: KpiCardProps) {
  return (
    <div
      data-slot="kpi-card"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm",
        onClick && "cursor-pointer hover:bg-card-hover hover:shadow-md",
        accentColor && "border-l-4",
        className
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold leading-none tracking-tight text-foreground sm:text-[32px]">
            {value}
          </span>
          {delta !== undefined && deltaDirection && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                deltaDirection === "up" ? "text-[#22C55E]" : "text-[#EF4444]"
              )}
            >
              {deltaDirection === "up" ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )}
              {delta}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
        {sparkline && <div className="shrink-0">{sparkline}</div>}
      </div>
    </div>
  )
}

export { KpiCard }
export type { KpiCardProps }
