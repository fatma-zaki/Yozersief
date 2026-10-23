import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // forbidden() / forbidden.tsx for permission-gated dashboard sections (brief A6.3).
    authInterrupts: true,
  },
  turbopack: {
    rules: {
      // Tailwind for plain stylesheets only. CSS Modules (*.module.css) must keep Next's own
      // module pipeline: `as: "*.css"` would turn them into global CSS, breaking :global()
      // and the hashed class names (the splash screen rendered unstyled because of this).
      "*.css": {
        condition: { all: [{ not: "foreign" }, { not: { path: /\.module\.css$/ } }] },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN is set (Vercel builds); the release name
// defaults to the deployment's commit SHA.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
