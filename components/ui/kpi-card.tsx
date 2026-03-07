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
  onClick,
  className,
  ...props
}: KpiCardProps) {
  return (
    <div
      data-slot="kpi-card"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5",
        onClick && "cursor-pointer transition-colors hover:bg-[#1E1E1E] hover:border-[#3A3A3A]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#A0A0A0]">{label}</span>
        {icon && <span className="text-[#666666]">{icon}</span>}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[32px] font-bold leading-none text-[#FAFAFA]">
            {value}
          </span>
          {subtitle && (
            <span className="text-xs text-[#A0A0A0]">{subtitle}</span>
          )}
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
        </div>
        {sparkline && <div className="shrink-0">{sparkline}</div>}
      </div>
    </div>
  )
}

export { KpiCard }
export type { KpiCardProps }
