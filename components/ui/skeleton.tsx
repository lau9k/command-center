import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "card" | "chart";

interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: SkeletonVariant;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  card: "h-32 w-full rounded-lg",
  chart: "h-48 w-full rounded-lg",
};

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted rounded-md",
        variant && variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps, SkeletonVariant };
