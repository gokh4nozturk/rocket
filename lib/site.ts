/**
 * Central site metadata. Single source of truth for SEO, sitemap, robots,
 * manifest, Open Graph images and the llms.txt routes.
 */

function readBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";
  return raw.replace(/\/$/, "");
}

export const siteConfig = {
  author: {
    name: "Gökhan Öztürk",
    /** Twitter/X handle, including the leading @. */
    twitter: "@gokh4nozturk",
    url: "https://gozturk.dev",
  },
  description:
    "A distinctive shadcn registry of data & observability components — query builders, JSON inspectors, diff viewers, log streams, metric charts, trace waterfalls and more. Install them into your app with the shadcn CLI.",
  keywords: [
    "shadcn",
    "shadcn registry",
    "shadcn ui",
    "react components",
    "tailwind css",
    "next.js",
    "component library",
    "timeline component",
    "activity feed",
    "comment thread",
    "query builder",
    "json inspector",
    "stat tile",
    "kpi",
    "diff viewer",
    "json diff",
    "log stream",
    "live tail",
    "metric chart",
    "time series",
    "trace waterfall",
    "distributed tracing",
    "latency histogram",
    "distribution",
    "status grid",
    "status page",
    "cohort heatmap",
    "retention",
    "audit trail",
    "changelog",
    "alert feed",
    "incident",
    "data freshness",
    "pipeline status",
    "data grid",
    "data table",
    "schema diagram",
    "er diagram",
    "sql console",
    "sql runner",
    "data lineage",
    "dag",
    "resource monitor",
    "gauge",
    "request inspector",
    "http",
    "data quality",
    "data validation",
    "treemap",
    "storage map",
    "calendar heatmap",
    "activity",
    "funnel",
    "conversion",
    "data dictionary",
    "catalog",
    "cron",
    "scheduler",
    "field mapper",
    "mapping",
    "routing rules",
    "alert routing",
    "json path",
    "jsonpath",
    "regex",
    "pattern tester",
    "slo",
    "error budget",
    "ui components",
  ],
  name: "rocket",
  /** Registry endpoint the shadcn CLI installs from. */
  registryUrl: `${readBaseUrl()}/r`,
  /** Used in <title> templates and Open Graph site name. */
  title: "rocket — a distinctive shadcn component registry",
  /** Absolute origin, e.g. https://rocket.gozturk.dev (no trailing slash). */
  url: readBaseUrl(),
} as const;

export type SiteConfig = typeof siteConfig;
