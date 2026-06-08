import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";

/**
 * Catalogue card for the home grid: title, description and a copyable install
 * command in the header, with a clipped, non-interactive live preview of the
 * component below it fading into the card. The whole card links to the
 * component's page via a stretched link; the copy button sits above it.
 */
export function PreviewCard({
  slug,
  title,
  description,
  registryName,
  demo,
}: {
  slug: string;
  title: string;
  description: string;
  registryName: string;
  demo: ReactNode;
}) {
  const command = `npx shadcn@latest add ${REGISTRY_URL}/r/${registryName}.json`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20">
      <div className="flex flex-col gap-2.5 border-b p-4">
        <Link
          className="flex items-center gap-1 font-medium text-foreground text-sm after:absolute after:inset-0"
          href={`/${slug}`}
        >
          {title}
          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        <div className="relative z-10 flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
          <code className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
            {command}
          </code>
          <CopyButton label={`Copy install command for ${title}`} value={command} />
        </div>
      </div>

      <div className="relative h-56 overflow-hidden">
        <div className="pointer-events-none select-none p-4">{demo}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      </div>
    </div>
  );
}
