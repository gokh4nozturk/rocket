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
    url: "https://gozturk.dev",
  },
  description:
    "A small, distinctive component library distributed as a shadcn registry. Install nested timelines, activity feeds and threaded comment components straight into your app with the shadcn CLI.",
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
