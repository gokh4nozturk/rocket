import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

/**
 * Serves /llms.txt — an LLM-friendly index of the registry following the
 * llmstxt.org convention. Statically generated; lists every component with a
 * link to its page and its shadcn install command.
 */
export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [];

  lines.push(`# ${siteConfig.name}`);
  lines.push("");
  lines.push(`> ${siteConfig.description}`);
  lines.push("");
  lines.push(
    `Components are installed with the shadcn CLI. Each item is fetched from \`${siteConfig.registryUrl}/<name>.json\` and copied into the consumer's \`components/ui/\` directory.`,
  );
  lines.push("");

  lines.push("## Components");
  lines.push("");
  for (const entry of showcaseEntries) {
    lines.push(`- [${entry.title}](${siteConfig.url}/${entry.slug}): ${entry.description}`);
    lines.push(
      `  - Install: \`npx shadcn@latest add ${siteConfig.registryUrl}/${entry.slug}.json\``,
    );
  }
  lines.push("");

  lines.push("## Resources");
  lines.push("");
  lines.push(
    `- [Full source for every component](${siteConfig.url}/llms-full.txt): TSX source inlined for context.`,
  );
  lines.push(
    `- [Registry index](${siteConfig.registryUrl}/registry.json): machine-readable shadcn registry.`,
  );
  lines.push(`- [Sitemap](${siteConfig.url}/sitemap.xml)`);
  lines.push("");

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
