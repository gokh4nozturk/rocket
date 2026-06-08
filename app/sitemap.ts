import type { MetadataRoute } from "next";
import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const home: MetadataRoute.Sitemap[number] = {
    changeFrequency: "weekly",
    lastModified,
    priority: 1,
    url: siteConfig.url,
  };

  const components: MetadataRoute.Sitemap = showcaseEntries.map((entry) => ({
    changeFrequency: "monthly",
    lastModified,
    priority: 0.8,
    url: `${siteConfig.url}/${entry.slug}`,
  }));

  return [home, ...components];
}
