"use client";

import { colors } from "@/lib/design-tokens";

interface ContactAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic color from name string */
function getColor(name: string): string {
  const palette = [
    colors.accent.blue,
    colors.accent.green,
    colors.accent.purple,
    colors.accent.orange,
    colors.accent.yellow,
    colors.accent.red,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function ContactAvatar({ name, size = "md", className = "" }: ContactAvatarProps) {
  const initials = getInitials(name);
  const bg = getColor(name);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bg }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
