"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ExternalLink,
  Linkedin,
  Github,
  Send,
  Database,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TaskWithProject } from "@/lib/types/database";

interface TaskActionButtonsProps {
  task: TaskWithProject;
}

interface ActionButton {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

function getExternalLinkButton(url: string): ActionButton | null {
  const lower = url.toLowerCase();

  if (lower.includes("linkedin.com")) {
    return {
      key: "linkedin",
      label: "Open LinkedIn",
      icon: <Linkedin className="size-3.5" />,
      href: url,
    };
  }
  if (lower.includes("github.com")) {
    return {
      key: "github",
      label: "Open GitHub",
      icon: <Github className="size-3.5" />,
      href: url,
    };
  }
  if (lower.includes("supabase")) {
    return {
      key: "supabase",
      label: "Open Supabase",
      icon: <Database className="size-3.5" />,
      href: url,
    };
  }
  if (lower.includes("vercel")) {
    return {
      key: "vercel",
      label: "Open Vercel",
      icon: <BarChart3 className="size-3.5" />,
      href: url,
    };
  }
  if (lower.includes("linear.app")) {
    return {
      key: "linear",
      label: "Open Linear",
      icon: <BarChart3 className="size-3.5" />,
      href: url,
    };
  }

  return {
    key: "external",
    label: "Open Link",
    icon: <ExternalLink className="size-3.5" />,
    href: url,
  };
}

export function TaskActionButtons({ task }: TaskActionButtonsProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);

  const hasMessage =
    task.task_type === "outreach" && !!task.description?.trim();

  const handleCopy = useCallback(async () => {
    if (!task.description) return;
    try {
      await navigator.clipboard.writeText(task.description);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = task.description;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 3000);
  }, [task.description]);

  const handleMarkSent = useCallback(async () => {
    setMarkingSent(true);
    const previous = queryClient.getQueryData<TaskWithProject[]>([
      "tasks",
      "list",
    ]);
    queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
      old?.map((t) =>
        t.id === task.id
          ? { ...t, status: "done" as const, updated_at: new Date().toISOString() }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Marked as sent");
    } catch {
      queryClient.setQueryData(["tasks", "list"], previous);
      toast.error("Failed to mark as sent");
    } finally {
      setMarkingSent(false);
    }
  }, [task.id, queryClient]);

  const buttons: ActionButton[] = [];

  // External URL button
  if (task.external_url) {
    const linkButton = getExternalLinkButton(task.external_url);
    if (linkButton) buttons.push(linkButton);
  }

  if (!buttons.length && !hasMessage) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        {buttons.map((btn) => (
          <Tooltip key={btn.key}>
            <TooltipTrigger asChild>
              {btn.href ? (
                <Button variant="outline" size="xs" asChild>
                  <a
                    href={btn.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {btn.icon}
                    {btn.label}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="xs" onClick={btn.onClick}>
                  {btn.icon}
                  {btn.label}
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>{btn.label}</TooltipContent>
          </Tooltip>
        ))}

        {hasMessage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy Message"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy outreach message to clipboard"}
              </TooltipContent>
            </Tooltip>

            {copied && task.status !== "done" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="xs"
                    onClick={handleMarkSent}
                    disabled={markingSent}
                  >
                    <Send className="size-3.5" />
                    {markingSent ? "Updating…" : "Mark as Sent"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark task as done</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
