import * as Sentry from "@sentry/nextjs";

interface ErrorLogEntry {
  error: Error;
  componentStack?: string;
  moduleName?: string;
  timestamp: string;
}

export function logModuleError(
  error: Error,
  errorInfo?: { componentStack?: string },
  moduleName?: string,
): void {
  const entry: ErrorLogEntry = {
    error,
    componentStack: errorInfo?.componentStack ?? undefined,
    moduleName,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    console.error(`[ErrorBoundary${moduleName ? `:${moduleName}` : ""}]`, {
      message: entry.error.message,
      componentStack: entry.componentStack,
      timestamp: entry.timestamp,
    });
  }

  Sentry.captureException(error, {
    tags: {
      module: moduleName ?? "unknown",
      source: "error-boundary",
    },
    contexts: {
      component: {
        stack: errorInfo?.componentStack,
      },
    },
  });
}
