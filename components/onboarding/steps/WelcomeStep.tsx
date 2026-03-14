"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rocket } from "lucide-react";

interface WelcomeStepProps {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
}

export function WelcomeStep({
  displayName,
  onDisplayNameChange,
  role,
  onRoleChange,
}: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome to Command Center
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Let&apos;s get you set up. Tell us a bit about yourself.
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            placeholder="e.g. Sales Manager, Founder"
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
