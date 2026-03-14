"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

export function ApiKeysStep() {
  const [personizeKey, setPersonizeKey] = useState("");
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleValidate = useCallback(async () => {
    if (!personizeKey.trim()) return;
    setValidationStatus("validating");
    setValidationMessage(null);

    try {
      const res = await fetch("/api/settings/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "personize", key: personizeKey }),
      });
      const result = await res.json();
      setValidationStatus(result.valid ? "valid" : "invalid");
      setValidationMessage(result.message ?? null);
    } catch {
      setValidationStatus("invalid");
      setValidationMessage("Validation request failed");
    }
  }, [personizeKey]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Key className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          API Keys
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your Personize API key for enrichment. This step is optional.
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="personize-key">Personize API Key</Label>
          <div className="flex gap-2">
            <Input
              id="personize-key"
              type="password"
              placeholder="pk_live_..."
              value={personizeKey}
              onChange={(e) => {
                setPersonizeKey(e.target.value);
                setValidationStatus("idle");
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={!personizeKey.trim() || validationStatus === "validating"}
              className="shrink-0"
            >
              {validationStatus === "validating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Validate"
              )}
            </Button>
          </div>
          {validationStatus !== "idle" && (
            <div className="flex items-center gap-1.5">
              {validationStatus === "validating" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Validating...</span>
                </>
              )}
              {validationStatus === "valid" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-500">{validationMessage ?? "Valid"}</span>
                </>
              )}
              {validationStatus === "invalid" && (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-red-500">{validationMessage ?? "Invalid"}</span>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          You can always add or change API keys later in Settings &rarr; API Keys.
        </p>
      </div>
    </div>
  );
}
