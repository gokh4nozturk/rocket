import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

/** Shared Open Graph / Twitter image dimensions. */
export const ogSize = { height: 630, width: 1200 };
export const ogContentType = "image/png";

/**
 * Renders a 1200×630 social card. Used by every `opengraph-image` and
 * `twitter-image` route so the visual stays consistent across pages.
 */
export function renderOgImage({ title, subtitle }: { title: string; subtitle: string }) {
  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "80px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", fontSize: 36, fontWeight: 600 }}>
        <div
          style={{
            background: "#fafafa",
            borderRadius: 12,
            height: 44,
            marginRight: 20,
            width: 44,
          }}
        />
        {siteConfig.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ color: "#a1a1aa", fontSize: 34, marginTop: 28, maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ color: "#71717a", fontSize: 26 }}>{siteConfig.url.replace("https://", "")}</div>
    </div>,
    { ...ogSize },
  );
}
