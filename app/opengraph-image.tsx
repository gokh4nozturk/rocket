import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage({
    subtitle: siteConfig.description,
    title: "A distinctive shadcn registry",
  });
}
