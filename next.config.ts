import type { NextConfig } from "next";
import { siteConfig } from "./lib/site";

const canonicalHost = new URL(siteConfig.url).host;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Canonicalize www → non-www so both resolve to a single origin (SEO).
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${canonicalHost}` }],
        destination: `${siteConfig.url}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
