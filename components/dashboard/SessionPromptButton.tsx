"use client";

import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SESSION_PROMPTS,
  buildSessionPrompt,
} from "@/config/session-prompts";

interface SessionPromptButtonProps {
  projectKey?: string;
}

export function SessionPromptButton({ projectKey }: SessionPromptButtonProps) {
  const configKey = projectKey ?? "general";
  const config = SESSION_PROMPTS[configKey];

  if (!config) return null;

  async function handleClick() {
    const prompt = buildSessionPrompt(config);
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Session prompt copied — paste into Cowork");
    } catch {
      toast.error("Failed to copy prompt to clipboard");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      <ClipboardCopy className="size-4" />
      Start Session
    </Button>
  );
}
