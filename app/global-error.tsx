"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        className="bg-[#0A0A0A] text-[#F5F5F5] dark:bg-[#0A0A0A] dark:text-[#F5F5F5]"
      >
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            maxWidth: "480px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "24px",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: "0 0 12px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#A0A0A0",
              margin: "0 0 32px",
            }}
          >
            An unexpected error occurred. The issue has been reported and
            we&apos;re looking into it.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "1px solid #2A2A2A",
              backgroundColor: "#141414",
              color: "#F5F5F5",
              cursor: "pointer",
              transition: "background-color 150ms",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#1E1E1E")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#141414")
            }
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
