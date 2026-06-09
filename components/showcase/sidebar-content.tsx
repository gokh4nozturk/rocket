import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarNav, type SidebarNavItem } from "@/components/showcase/sidebar-nav";
import { siteConfig } from "@/lib/site";

/**
 * The inner sidebar content (brand, nav, resources, author, theme toggle).
 * Shared by the desktop `<aside>` and the mobile drawer so they never drift.
 */
export function SidebarContent({ items }: { items: SidebarNavItem[] }) {
  return (
    <>
      <Link className="flex flex-col gap-0.5" href="/">
        <span className="font-semibold text-foreground">rocket</span>
        <span className="text-muted-foreground text-xs">shadcn registry</span>
      </Link>
      <SidebarNav items={items} />
      <nav aria-label="Resources" className="mt-auto flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Resources
        </span>
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/llms.txt"
        >
          llms.txt
        </Link>
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/llms-full.txt"
        >
          llms-full.txt
        </Link>
      </nav>
      <div className="flex flex-col gap-3 border-border border-t pt-3">
        <div className="flex flex-col gap-1.5 text-sm">
          <a
            className="text-muted-foreground transition-colors hover:text-foreground"
            href={siteConfig.author.url}
            rel="noreferrer"
            target="_blank"
          >
            {siteConfig.author.name}
          </a>
          <a
            className="text-muted-foreground transition-colors hover:text-foreground"
            href={`https://x.com/${siteConfig.author.twitter.replace(/^@/, "")}`}
            rel="noreferrer"
            target="_blank"
          >
            {siteConfig.author.twitter}
          </a>
        </div>
        <ModeToggle />
      </div>
    </>
  );
}
