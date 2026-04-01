"use client";

import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { Skeleton } from "@/components/dashboard/LoadingSkeleton";

interface LazyLoadProps<P extends object> {
  /** Factory function returning the dynamic import */
  loader: () => Promise<{ default: ComponentType<P> }>;
  /** Custom fallback; defaults to a pulsing skeleton block */
  fallback?: ReactNode;
  /** Minimum display time (ms) for the fallback to avoid flash */
  delay?: number;
  /** Props forwarded to the lazily-loaded component */
  componentProps?: P;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<() => Promise<unknown>, React.LazyExoticComponent<ComponentType<any>>>();

/**
 * Generic wrapper around React.lazy + Suspense.
 *
 * Deduplicates lazy() calls for the same loader so multiple renders
 * don't create redundant dynamic-import wrappers.
 */
export function LazyLoad<P extends object>({
  loader,
  fallback,
  delay,
  componentProps,
}: LazyLoadProps<P>) {
  if (!cache.has(loader)) {
    const factory = delay
      ? () =>
          Promise.all([
            loader(),
            new Promise((r) => setTimeout(r, delay)),
          ]).then(([mod]) => mod)
      : loader;

    cache.set(loader, lazy(factory));
  }

  const LazyComponent = cache.get(loader)! as ComponentType<P>;

  return (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
      <LazyComponent {...(componentProps ?? ({} as P))} />
    </Suspense>
  );
}

function DefaultFallback() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
