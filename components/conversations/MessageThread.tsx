"use client";

import { useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { MessageActions } from "./MessageActions";

export interface ParsedMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isContact: boolean;
}

interface MessageThreadProps {
  messages: ParsedMessage[];
  contactName?: string;
  conversationChannel?: string;
}

export function MessageThread({
  messages,
  contactName,
  conversationChannel,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-8 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No messages in this conversation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Thread ({messages.length}{" "}
        {messages.length === 1 ? "message" : "messages"})
      </h3>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`group relative flex ${msg.isContact ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[85%] rounded-lg border p-3 ${
              msg.isContact
                ? "bg-card"
                : "bg-primary/5 dark:bg-primary/10"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    msg.isContact
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.sender.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {msg.sender}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <MessageActions
                messageText={msg.text}
                contactName={contactName}
                conversationChannel={conversationChannel}
              />
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
              {msg.text}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
