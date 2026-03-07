import * as React from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

import { cn } from "@/lib/utils"

type CardVariant = "default" | "metric" | "interactive"

interface CardProps extends React.ComponentProps<"div"> {
  variant?: CardVariant
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

function Card({ className, variant = "default", onClick, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      onClick={variant === "interactive" ? onClick : undefined}
      className={cn(
        "flex flex-col gap-6 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm",
        variant === "interactive" &&
          "cursor-pointer transition-colors hover:bg-card-hover",
        className
      )}
      {...props}
    />
  )
}

interface MetricCardValueProps extends React.ComponentProps<"div"> {
  value: string | number
  subtitle?: string
  trend?: number
  trendDirection?: "up" | "down"
}

function MetricCardValue({
  className,
  value,
  subtitle,
  trend,
  trendDirection,
  ...props
}: MetricCardValueProps) {
  return (
    <div data-slot="metric-card-value" className={cn("flex flex-col gap-1", className)} {...props}>
      <span className="text-2xl font-semibold text-foreground">{value}</span>
      {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      {trend !== undefined && trendDirection && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium",
            trendDirection === "up" ? "text-[#22C55E]" : "text-[#EF4444]"
          )}
        >
          {trendDirection === "up" ? (
            <ArrowUpRight className="size-4" />
          ) : (
            <ArrowDownRight className="size-4" />
          )}
          {trend}%
        </span>
      )}
    </div>
  )
}

interface InteractiveCardLinkProps extends React.ComponentProps<"a"> {
  label?: string
}

function InteractiveCardLink({
  className,
  label = "Open",
  ...props
}: InteractiveCardLinkProps) {
  return (
    <a
      data-slot="interactive-card-link"
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-[#3B82F6] hover:underline",
        className
      )}
      {...props}
    >
      {label} &rarr;
    </a>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  MetricCardValue,
  InteractiveCardLink,
}
