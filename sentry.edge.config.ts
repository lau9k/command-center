import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.VERCEL_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.2 : 1.0,

  beforeSend(event) {
    if (event.message) {
      event.message = event.message.replace(
        /[\w.-]+@[\w.-]+\.\w+/g,
        "[EMAIL_REDACTED]"
      );
    }

    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }

    return event;
  },
});
