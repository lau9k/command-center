"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsProfileProps {
  email: string | null;
  userId: string | null;
}

function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export function SettingsProfile({ email, userId }: SettingsProfileProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 text-lg">
          <AvatarFallback>
            {email ? getInitials(email) : "??"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {email ?? "Not signed in"}
          </p>
          {userId && (
            <p className="text-xs text-muted-foreground font-mono">
              ID: {userId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email ?? ""}
          disabled
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          Email is managed by your authentication provider.
        </p>
      </div>
    </div>
  );
}
