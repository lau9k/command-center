import { cn } from "@/lib/utils";

interface ResponsiveKPIGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveKPIGrid({ children, className }: ResponsiveKPIGridProps) {
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6",
        className
      )}
    >
      {children}
    </section>
  );
}
