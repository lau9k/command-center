"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
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
          backgroundColor: "#0A0A0A",
          color: "#F5F5F5",
          fontFamily:
            'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: "center", padding: "48px", maxWidth: "480px" }}>
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
              color: "#EF4444",
            }}
          >
            <svg
              width="24"
              height="24"
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#F7C948",
                color: "#000000",
                cursor: "pointer",
                transition: "background-color 150ms",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#e5b83d")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#F7C948")
              }
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                border: "1px solid #2A2A2A",
                backgroundColor: "#141414",
                color: "#F5F5F5",
                cursor: "pointer",
                textDecoration: "none",
                transition: "background-color 150ms",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#1E1E1E")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#141414")
              }
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
