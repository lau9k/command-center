"use client";

import { type ReactNode, useCallback, useRef } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { ModuleFallback } from "./ModuleFallback";

interface DashboardErrorWrapperProps {
  module: string;
  variant?: "compact" | "full";
  onError?: (error: Error) => void;
  children: ReactNode;
}

export function DashboardErrorWrapper({
  module,
  variant = "full",
  onError,
  children,
}: DashboardErrorWrapperProps) {
  const boundaryRef = useRef<ErrorBoundary>(null);

  const handleRetry = useCallback(() => {
    boundaryRef.current?.handleReset();
  }, []);

  return (
    <ErrorBoundary
      ref={boundaryRef}
      moduleName={module}
      onError={onError}
      fallback={
        <ModuleFallback
          moduleName={module}
          variant={variant}
          onRetry={handleRetry}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}
