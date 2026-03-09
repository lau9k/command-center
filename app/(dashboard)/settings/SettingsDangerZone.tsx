"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsDangerZone() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Sign out</p>
        <p className="text-sm text-muted-foreground">
          End your current session and return to the login page
        </p>
      </div>
      <form action="/auth/sign-out" method="post">
        <Button variant="destructive" size="sm" type="submit">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
