"use client";

import { User, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Member {
  id: string;
  name: string;
  wallet_address: string;
  joined_date: string;
  mass_held: number;
}

function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface MemberCardProps {
  member: Member;
  className?: string;
}

export function MemberCard({ member, className }: MemberCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm",
        className
      )}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/10">
          <User className="size-5 text-[#3B82F6]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {member.name}
          </p>
          <p
            className="truncate text-xs text-muted-foreground font-mono"
            title={member.wallet_address}
          >
            {truncateWallet(member.wallet_address)}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Joined {formatDate(member.joined_date)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#A855F7]/15 px-2 py-0.5 text-[#A855F7] font-medium">
          <Coins className="size-3" />
          {member.mass_held.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
