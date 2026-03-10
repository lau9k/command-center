import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Upload source maps to Sentry during builds
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress source map upload logs in CI
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,
});
