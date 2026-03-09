"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TaskQuickAddProps {
  onAdd: (title: string) => void;
  disabled?: boolean;
}

export function TaskQuickAdd({ onAdd, disabled }: TaskQuickAddProps) {
  const [title, setTitle] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  }

  return (
    <div className="relative">
      <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Quick-add task — type title and hit Enter"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="pl-9"
      />
    </div>
  );
}
