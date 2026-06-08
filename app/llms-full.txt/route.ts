import { getComponentSource } from "@/lib/registry-source";
import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

/**
 * Serves /llms-full.txt — the full registry context for LLMs: every component's
 * description, install command and complete TSX source inlined in one document.
 */
export const dynamic = "force-static";

export async function GET() {
  const lines: string[] = [];

  lines.push(`# ${siteConfig.name} — full component source`);
  lines.push("");
  lines.push(`> ${siteConfig.description}`);
  lines.push("");
  lines.push(
    `Install any component with: \`npx shadcn@latest add ${siteConfig.registryUrl}/<name>.json\``,
  );
  lines.push("");

  for (const entry of showcaseEntries) {
    const { code } = await getComponentSource(entry.registryName);

    lines.push(`## ${entry.title}`);
    lines.push("");
    lines.push(entry.description);
    lines.push("");
    lines.push(`- Page: ${siteConfig.url}/${entry.slug}`);
    lines.push(`- Install: \`npx shadcn@latest add ${siteConfig.registryUrl}/${entry.slug}.json\``);
    lines.push(`- Source: \`components/ui/${entry.registryName}.tsx\``);
    lines.push("");
    lines.push("```tsx");
    lines.push(code.trimEnd());
    lines.push("```");
    lines.push("");
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
