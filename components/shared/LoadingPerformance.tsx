"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface LoadingPerformanceProps {
  /** Identifier logged alongside the timing */
  name: string;
  children: ReactNode;
}

/**
 * Dev-only wrapper that measures how long a Suspense boundary takes to resolve.
 *
 * Wrap this around a <Suspense> boundary's children. It records a timestamp on
 * mount and logs the elapsed time since creation, giving visibility into lazy
 * chunk load durations during development.
 *
 * In production builds this renders children with zero overhead.
 */
export function LoadingPerformance({ name, children }: LoadingPerformanceProps) {
  if (process.env.NODE_ENV !== "development") {
    return <>{children}</>;
  }

  return <PerformanceTracker name={name}>{children}</PerformanceTracker>;
}

function PerformanceTracker({ name, children }: LoadingPerformanceProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      performance.mark(`lazy-start-${name}`);
    }
  }, [name]);

  useEffect(() => {
    performance.mark(`lazy-end-${name}`);
    try {
      const measure = performance.measure(
        `lazy-${name}`,
        `lazy-start-${name}`,
        `lazy-end-${name}`
      );
      console.debug(
        `[LoadingPerformance] "${name}" resolved in ${measure.duration.toFixed(1)}ms`
      );
    } catch {
      // marks not yet available on first render
    }
  });

  return <>{children}</>;
}
