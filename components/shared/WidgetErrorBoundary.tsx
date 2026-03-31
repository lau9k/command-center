"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  /** Widget name shown in the fallback UI */
  name?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Reusable error boundary for home-page widgets.
 * Catches render errors so the rest of the dashboard stays functional.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Let Sentry or other error reporters pick this up via global handler
    console.error(
      `[WidgetErrorBoundary] ${this.props.name ?? "Widget"} crashed:`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <AlertCircle className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {this.props.name ?? "Widget"} unavailable
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Something went wrong loading this section.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="size-4" />
              Retry
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
