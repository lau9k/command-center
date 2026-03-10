import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance sampling: 20% in production, 100% in preview/development
  tracesSampleRate:
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.2 : 1.0,

  // Scrub PII from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
      // Remove request body data to avoid leaking PII
      if (breadcrumb.data) {
        delete breadcrumb.data.request_body;
        delete breadcrumb.data.response_body;
      }
    }
    return breadcrumb;
  },

  // Scrub PII from events
  beforeSend(event) {
    // Strip email addresses from event messages
    if (event.message) {
      event.message = event.message.replace(
        /[\w.-]+@[\w.-]+\.\w+/g,
        "[EMAIL_REDACTED]"
      );
    }

    // Remove request bodies from HTTP context
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }

    return event;
  },
});
