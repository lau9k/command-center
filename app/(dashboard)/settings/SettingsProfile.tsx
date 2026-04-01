"use client";

import { ProfileForm } from "@/components/settings/ProfileForm";

interface SettingsProfileProps {
  email: string | null;
  userId: string | null;
}

export function SettingsProfile({ email, userId }: SettingsProfileProps) {
  return <ProfileForm email={email} userId={userId} />;
}
