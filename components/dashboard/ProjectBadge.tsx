import { Badge } from "@/components/ui/badge";

interface ProjectBadgeProps {
  name: string;
  color?: string | null;
}

export function ProjectBadge({ name, color }: ProjectBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="text-xs"
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      {name}
    </Badge>
  );
}
