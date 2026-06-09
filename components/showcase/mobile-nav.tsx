"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarContent } from "@/components/showcase/sidebar-content";
import type { SidebarNavItem } from "@/components/showcase/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Mobile-only top bar: brand + hamburger that opens the sidebar in a left drawer. */
export function MobileNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (e.g. a nav link was tapped).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a read
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-border border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <Link className="font-semibold text-foreground text-sm" href="/">
        rocket
      </Link>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger render={<Button aria-label="Open menu" size="icon-sm" variant="ghost" />}>
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent className="w-72 max-w-[80vw] gap-0 p-6" side="left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col gap-6 overflow-y-auto">
            <SidebarContent items={items} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
