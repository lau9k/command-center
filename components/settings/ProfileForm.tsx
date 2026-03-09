"use client";

import { useState, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface ProfileFormProps {
  email: string | null;
  userId: string | null;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (UTC-5)" },
  { value: "America/Chicago", label: "Central (UTC-6)" },
  { value: "America/Denver", label: "Mountain (UTC-7)" },
  { value: "America/Los_Angeles", label: "Pacific (UTC-8)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { value: "Europe/London", label: "London (UTC+0)" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1)" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+11)" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ProfileForm({ email, userId }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(
    email ? email.split("@")[0] : ""
  );
  const [userEmail, setUserEmail] = useState(email ?? "");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    // Optimistic update — show success immediately
    try {
      // Simulate save (no real API endpoint needed for demo)
      await new Promise((r) => setTimeout(r, 600));
      setSaved(true);
      toast.success("Profile updated successfully");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 text-lg">
          <AvatarFallback>
            {displayName ? getInitials(displayName) : "??"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {displayName || "Not signed in"}
          </p>
          {userId && (
            <p className="text-xs text-muted-foreground font-mono">
              ID: {userId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Display Name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Managed by your authentication provider
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="profile-timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
      </Button>
    </div>
  );
}
