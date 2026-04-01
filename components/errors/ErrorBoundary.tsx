"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logModuleError } from "./error-logger";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  children: ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logModuleError(
      error,
      { componentStack: errorInfo.componentStack ?? undefined },
      this.props.moduleName,
    );
    this.props.onError?.(error);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function DefaultFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/20">
          <svg
            className="h-6 w-6 text-destructive"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
}
