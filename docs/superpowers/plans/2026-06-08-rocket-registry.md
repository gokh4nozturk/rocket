# rocket — shadcn Component Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `rocket`, a single Next.js (App Router) app that is both a docs/playground site and a shadcn registry, shipping one portable, TypeScript `Timeline` component installable via `npx shadcn add`.

**Architecture:** One Next.js app. Component sources live in `components/ui`. A root `registry.json` describes them; `shadcn build` compiles each into self-contained JSON under `public/r/`, served statically. The docs site renders live previews and copyable install commands. Components use only standard shadcn tokens so they inherit any consumer's theme.

**Tech Stack:** Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (new-york, CSS variables, base color neutral) · Biome · motion · lucide-react · next-themes · pnpm · Node ≥ 22.

**Spec:** `docs/superpowers/specs/2026-06-08-rocket-registry-design.md`

> **Git note:** The user manages git for this repo. `create-next-app` is run with `--disable-git`. If you want the per-task commits below, run `git init` in `rocket/` first; otherwise treat each "Commit" step as a checkpoint to skip.

> **Working directory:** All paths are relative to `/Users/gokhanozturk/Desktop/dev/labs/rocket` unless stated. The directory currently contains only `docs/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `components/ui/timeline.tsx` | The registry component (source of truth). Nested collapsible timeline, single-SVG-path connector. |
| `components/showcase/component-showcase.tsx` | Docs primitive: title, description, copyable install command, live preview. |
| `components/theme-provider.tsx` | `next-themes` wrapper. |
| `components/mode-toggle.tsx` | Light/dark toggle button. |
| `lib/utils.ts` | `cn()` (created by shadcn init). |
| `app/layout.tsx` | Root layout: fonts, ThemeProvider, header. |
| `app/page.tsx` | Landing + component gallery (Timeline demo). |
| `app/globals.css` | Tailwind v4 + shadcn token definitions (created by shadcn init). |
| `registry.json` | Registry manifest (input to `shadcn build`). |
| `public/r/timeline.json` | Generated registry item (output of `shadcn build`). |
| `components.json` | shadcn config (created by shadcn init). |
| `biome.json` | Lint + format config (mirrors gozturk.dev). |
| `.env.example` / `.env.local` | `NEXT_PUBLIC_REGISTRY_URL`. |

---

## Task 1: Scaffold the Next.js app (preserving `docs/`)

**Files:**
- Create: entire Next.js app tree in `rocket/` (via `create-next-app`)
- Preserve: existing `rocket/docs/`

- [ ] **Step 1: Scaffold into a temp sibling dir**

`create-next-app` refuses non-empty dirs (and `rocket/` already has `docs/`), so scaffold next to it, then merge.

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs
pnpm create next-app@latest rocket-scaffold \
  --ts --tailwind --no-eslint --app --no-src-dir \
  --import-alias "@/*" --use-pnpm --turbopack \
  --disable-git --skip-install
```
Expected: a `rocket-scaffold/` dir with `app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `app/globals.css`, `postcss.config.mjs`, `.gitignore`. (Next 15+/Tailwind v4 defaults.)

- [ ] **Step 2: Merge scaffold into `rocket/` (keep `docs/`)**

Run:
```bash
cp -R /Users/gokhanozturk/Desktop/dev/labs/rocket-scaffold/. /Users/gokhanozturk/Desktop/dev/labs/rocket/
rm -rf /Users/gokhanozturk/Desktop/dev/labs/rocket-scaffold
cd /Users/gokhanozturk/Desktop/dev/labs/rocket
```
Expected: `rocket/` now has both `app/` and `docs/`. `ls -a` shows `.gitignore`, `package.json`, `app`, `docs`.

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket && pnpm install
```
Expected: installs cleanly, creates `node_modules` and `pnpm-lock.yaml`.

- [ ] **Step 4: Verify dev server boots**

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket && pnpm build
```
Expected: `next build` succeeds (default starter page). If it fails, fix before proceeding.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold next.js app (ts, tailwind v4, app router)"
```

---

## Task 2: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `lib/utils.ts`
- Modify: `app/globals.css` (shadcn token layer added)

- [ ] **Step 1: Run shadcn init with defaults**

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket && pnpm dlx shadcn@latest init --defaults --yes
```
Expected: creates `components.json` (style `new-york`, `rsc: true`, `tsx: true`, base color `neutral`, `cssVariables: true`), creates `lib/utils.ts` with `cn()`, and injects the shadcn token blocks (`--background`, `--foreground`, `--primary`, `--border`, `--muted`, `--card`, etc., plus `.dark`) into `app/globals.css`.

> If `--defaults` is rejected by the installed CLI version, run `pnpm dlx shadcn@latest init` and answer: style → new-york, base color → neutral, CSS variables → yes.

- [ ] **Step 2: Verify tokens exist**

Run:
```bash
grep -E "\-\-(background|foreground|primary|border|muted|card)\b" app/globals.css | head
```
Expected: matches for the standard shadcn CSS variables in both `:root` and `.dark`.

- [ ] **Step 3: Verify `cn` helper**

Run:
```bash
cat lib/utils.ts
```
Expected: exports `cn(...inputs)` using `clsx` + `tailwind-merge`. (If shadcn didn't create it, create it now:)
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Add a sanity component to confirm the pipeline (then remove)**

Run:
```bash
pnpm dlx shadcn@latest add button --yes
```
Expected: `components/ui/button.tsx` created, deps installed. This proves `components.json` aliases resolve. Keep `button.tsx` (used by `mode-toggle.tsx` later).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: init shadcn/ui (new-york, neutral, css variables)"
```

---

## Task 3: Project dependencies, Biome, scripts, env

**Files:**
- Create: `biome.json`, `.env.example`, `.env.local`
- Modify: `package.json`

- [ ] **Step 1: Add runtime + tooling deps**

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket
pnpm add motion next-themes
pnpm add -D -E @biomejs/biome shadcn
```
Expected: `motion`, `next-themes` in `dependencies`; `@biomejs/biome`, `shadcn` in `devDependencies`. (`lucide-react`, `clsx`, `tailwind-merge` were added by shadcn init.)

- [ ] **Step 2: Create `biome.json` (mirrors gozturk.dev)**

Create `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.16/schema.json",
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on",
        "useSortedAttributes": "on",
        "useSortedKeys": "on",
        "useSortedProperties": "on"
      }
    }
  },
  "files": {
    "ignoreUnknown": true,
    "includes": ["./app/**/*", "./components/**/*", "./lib/**/*"]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "domains": {
      "next": "recommended"
    },
    "enabled": true,
    "rules": {
      "a11y": {
        "noSvgWithoutTitle": "off"
      },
      "nursery": {
        "useSortedClasses": {
          "fix": "safe",
          "level": "error",
          "options": {
            "attributes": ["className"],
            "functions": ["cn"]
          }
        }
      },
      "recommended": true
    }
  }
}
```

- [ ] **Step 3: Update `package.json` scripts**

Replace the `scripts` block in `package.json` with:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "shadcn build && next build",
    "start": "next start",
    "registry:build": "shadcn build",
    "lint": "biome lint .",
    "lint:fix": "biome check --write .",
    "format:check": "biome format .",
    "format:fix": "biome format --write ."
  }
}
```

- [ ] **Step 4: Create env files**

Create `.env.example`:
```bash
# Base URL where the registry JSON is served. Used to render install commands.
NEXT_PUBLIC_REGISTRY_URL=https://rocket.gozturk.dev
```

Create `.env.local`:
```bash
NEXT_PUBLIC_REGISTRY_URL=http://localhost:3000
```

- [ ] **Step 5: Verify Biome runs**

Run:
```bash
pnpm lint
```
Expected: Biome runs (may report findings on starter files; that's fine — we replace them next). No crash.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: add motion, next-themes, biome, scripts, env"
```

---

## Task 4: Port `Timeline` to TypeScript with shadcn tokens

**Files:**
- Create: `components/ui/timeline.tsx`

This is the registry component. It is the gozturk.dev single-SVG-path version, converted to TS, with `p3-*` tokens mapped to standard shadcn tokens. Behavior and geometry are unchanged.

- [ ] **Step 1: Write `components/ui/timeline.tsx`**

Create `components/ui/timeline.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import {
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  type LucideIcon,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type TimelineStatus = "error" | "success" | "warning" | "pending" | "info";

export interface TimelineItem {
  id?: string;
  title?: string;
  time?: string;
  description?: string;
  status?: TimelineStatus;
  children?: TimelineItem[];
  defaultOpen?: boolean;
}

export interface TimelineProps {
  items?: TimelineItem[];
  className?: string;
}

interface FlatRow {
  isGroup: boolean;
  item: TimelineItem;
  key: string;
  level: number;
  open: boolean;
}

interface MarkerPoint {
  cx: number;
  top: number;
  bottom: number;
}

/**
 * Status → icon + color mapping for leaf timeline events.
 * Status colors stay on raw palette tokens (with dark variants) since these are
 * semantic accents, not theme surface colors.
 */
const STATUS: Record<TimelineStatus, { className: string; icon: LucideIcon }> = {
  error: { className: "text-red-500 dark:text-red-400", icon: CircleX },
  info: { className: "text-muted-foreground", icon: CircleDot },
  pending: { className: "text-amber-500 dark:text-amber-400", icon: Clock },
  success: { className: "text-green-600 dark:text-green-400", icon: CircleCheck },
  warning: { className: "text-amber-500 dark:text-amber-400", icon: CircleDot },
};

const INDENT = 22; // px each nesting level shifts right
const RADIUS = 8; // px connector corner radius
const GAP = 10; // px vertical approach into a marker after a turn

function EventMarker({ status }: { status?: TimelineStatus }) {
  const { icon: Icon, className } = STATUS[status ?? "info"] ?? STATUS.info;
  return <Icon className={cn("size-4.5", className)} strokeWidth={2} />;
}

function GroupToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      aria-expanded={open}
      aria-label={open ? "Collapse group" : "Expand group"}
      className="flex size-4.5 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      <Plus className={cn("size-3 transition-transform", open && "rotate-45")} strokeWidth={2.5} />
    </button>
  );
}

function Row({
  row,
  markerRef,
}: {
  row: FlatRow & { onToggle: () => void };
  markerRef: (el: HTMLDivElement | null) => void;
}) {
  const { item, level, isGroup, open, onToggle } = row;

  return (
    <div className="relative flex items-start gap-2" style={{ paddingLeft: level * INDENT }}>
      <div className="relative z-10 shrink-0" ref={markerRef}>
        {isGroup ? (
          <GroupToggle onClick={onToggle} open={open} />
        ) : (
          <EventMarker status={item.status} />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        {isGroup ? (
          <button className="flex items-center gap-1.5 text-left" onClick={onToggle} type="button">
            {item.title && <span className="font-medium text-foreground text-sm">{item.title}</span>}
            <span className="text-muted-foreground text-xs">
              {item.title
                ? `${item.children?.length ?? 0} events`
                : `${item.children?.length ?? 0} more events`}
            </span>
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        ) : (
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium text-foreground text-sm">{item.title}</span>
              {item.time && <span className="text-muted-foreground text-xs">{item.time}</span>}
            </div>
            {item.description && (
              <p className="text-muted-foreground text-xs">{item.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Collect keys of groups that should start open. */
function collectOpen(items: TimelineItem[], parentKey: string, acc: Set<string>): Set<string> {
  items.forEach((item, i) => {
    const key = item.id ?? `${parentKey}/${i}`;
    if (Array.isArray(item.children) && item.children.length > 0) {
      if (item.defaultOpen) acc.add(key);
      collectOpen(item.children, key, acc);
    }
  });
  return acc;
}

/** Flatten the visible tree (respecting open state) into ordered rows. */
function flatten(
  items: TimelineItem[],
  openIds: Set<string>,
  level: number,
  parentKey: string,
  acc: FlatRow[],
): FlatRow[] {
  items.forEach((item, i) => {
    const key = item.id ?? `${parentKey}/${i}`;
    const isGroup = Array.isArray(item.children) && item.children.length > 0;
    const open = isGroup && openIds.has(key);
    acc.push({ isGroup, item, key, level, open });
    if (open && item.children) flatten(item.children, openIds, level + 1, key, acc);
  });
  return acc;
}

/**
 * Build a single SVG path that links each marker to the next as one continuous
 * line. Same-column hops are straight verticals; column changes weave through a
 * rounded elbow that descends at the source column, runs a floor, then drops
 * into the next marker. Coordinates are snapped to the pixel grid (+0.5) so the
 * 1px stroke stays crisp on the straight runs.
 */
function buildPath(points: (MarkerPoint | null)[]): string {
  const segs: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;

    const x1 = Math.round(a.cx) + 0.5;
    const x2 = Math.round(b.cx) + 0.5;
    const y1 = Math.round(a.bottom) + 0.5;
    const y2 = Math.round(b.top) + 0.5;

    if (x1 === x2) {
      segs.push(`M${x1} ${y1}L${x2} ${y2}`);
      continue;
    }

    const dir = x2 > x1 ? 1 : -1;
    const turnY = Math.round(y2 - GAP) + 0.5;
    const r = Math.min(RADIUS, Math.max(0, turnY - y1), Math.abs(x2 - x1) / 2);

    segs.push(
      `M${x1} ${y1}` +
        `L${x1} ${turnY - r}` +
        `Q${x1} ${turnY} ${x1 + dir * r} ${turnY}` +
        `L${x2 - dir * r} ${turnY}` +
        `Q${x2} ${turnY} ${x2} ${turnY + r}` +
        `L${x2} ${y2}`,
    );
  }
  return segs.join(" ");
}

/**
 * Timeline — renders a (optionally nested) timeline of events as one continuous
 * line that weaves into and out of collapsible groups.
 *
 * The connector is a single SVG path measured from the live marker positions, so
 * it stays seamless across row boundaries (no per-row border segments to align)
 * and re-traces itself as groups expand/collapse via a ResizeObserver.
 */
export function Timeline({ items = [], className }: TimelineProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => collectOpen(items, "", new Set()));
  const [path, setPath] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());

  const toggle = (key: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const rows = flatten(items, openIds, 0, "", []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const points: (MarkerPoint | null)[] = rows.map((row) => {
      const el = markerRefs.current.get(row.key);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        bottom: r.bottom - base.top,
        cx: r.left - base.left + r.width / 2,
        top: r.top - base.top,
      };
    });
    setPath(buildPath(points));
  }, [rows]);

  // Re-trace after every commit (open/close, content changes) and on any size
  // change — the latter covers the height-animation frames and viewport resizes.
  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className={cn("relative flex flex-col", className)} ref={containerRef}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-border"
        fill="none"
      >
        <path d={path} stroke="currentColor" strokeWidth="1" />
      </svg>

      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key={row.key}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Row
              markerRef={(el) => {
                if (el) markerRefs.current.set(row.key, el);
                else markerRefs.current.delete(row.key);
              }}
              row={{ ...row, onToggle: () => toggle(row.key) }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Format + sort classes**

Run:
```bash
pnpm biome check --write components/ui/timeline.tsx
```
Expected: "No fixes applied" or applies sorting/format. Re-run until clean.

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: no errors. (Fix any type errors before moving on.)

- [ ] **Step 4: Verify no `p3-` tokens leaked**

Run:
```bash
grep -n "p3-" components/ui/timeline.tsx; echo "exit=$?"
```
Expected: no matches (grep exit=1).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(timeline): port to typescript with shadcn tokens"
```

---

## Task 5: Docs primitives — ComponentShowcase, ThemeProvider, ModeToggle

**Files:**
- Create: `components/showcase/component-showcase.tsx`
- Create: `components/theme-provider.tsx`
- Create: `components/mode-toggle.tsx`

- [ ] **Step 1: Write `components/theme-provider.tsx`**

Create `components/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Write `components/mode-toggle.tsx`**

Create `components/mode-toggle.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      size="icon"
      variant="ghost"
    >
      <Sun className="dark:-rotate-90 size-4 rotate-0 scale-100 transition-all dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

- [ ] **Step 3: Write `components/showcase/component-showcase.tsx`**

Create `components/showcase/component-showcase.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      aria-label="Copy install command"
      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      onClick={copy}
      type="button"
    >
      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
    </button>
  );
}

/**
 * Doc-style showcase card: title, description, a copyable shadcn install command
 * and a live preview area.
 */
export function ComponentShowcase({
  title,
  description,
  name,
  children,
  className,
}: {
  title: string;
  description?: string;
  name: string;
  children: ReactNode;
  className?: string;
}) {
  const command = `npx shadcn@latest add ${REGISTRY_URL}/r/${name}.json`;

  return (
    <section className={cn("w-full", className)}>
      <h2 className="font-semibold text-foreground text-lg">{title}</h2>
      {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
        <code className="overflow-x-auto whitespace-nowrap font-mono text-foreground text-xs">
          {command}
        </code>
        <CopyButton value={command} />
      </div>

      <div className="mt-4 rounded-xl border bg-card p-5">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Format + type-check**

Run:
```bash
pnpm biome check --write components/ && pnpm exec tsc --noEmit
```
Expected: format clean, no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(docs): add showcase, theme provider, mode toggle"
```

---

## Task 6: Landing page + layout wiring

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write `app/layout.tsx`**

Replace `app/layout.tsx` with (keep whatever font setup the scaffold created if it differs; this uses the default `geist` fonts create-next-app adds):
```tsx
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  description: "A small, distinctive component library distributed as a shadcn registry.",
  title: "rocket",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
            <Link className="font-semibold text-foreground" href="/">
              rocket
            </Link>
            <ModeToggle />
          </header>
          <main className="mx-auto w-full max-w-3xl px-6 pb-28">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write `app/page.tsx`**

Replace `app/page.tsx` with:
```tsx
import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

const timelineItems: TimelineItem[] = [
  {
    description: "The user session timed out due to inactivity.",
    id: "auth-timeout",
    status: "error",
    time: "Just now",
    title: "Authenticated timed out",
  },
  {
    children: [
      {
        description: "The user session timed out due to inactivity.",
        id: "cres-1",
        status: "success",
        time: "1m ago",
        title: "CRes received",
      },
      {
        children: [
          {
            description: "The user session timed out due to inactivity.",
            id: "cres-2",
            status: "success",
            time: "1m ago",
            title: "CRes received",
          },
          {
            description: "The user session timed out due to inactivity.",
            id: "creq-1",
            status: "warning",
            time: "2m ago",
            title: "CReq sent",
          },
        ],
        defaultOpen: true,
        id: "challenge-2",
        title: "Challenge performed",
      },
      {
        description: "The user session timed out due to inactivity.",
        id: "creq-2",
        status: "warning",
        time: "2m ago",
        title: "CReq sent",
      },
    ],
    id: "challenge-3",
    title: "Challenge performed",
  },
  {
    description: "Issuer requires a challenge to be performed.",
    id: "action-required",
    status: "pending",
    time: "3m ago",
    title: "Action required",
  },
  {
    children: [
      {
        description: "The user resumed an existing session.",
        id: "session-resumed",
        status: "success",
        time: "5m ago",
        title: "Session resumed",
      },
      {
        description: "The authentication flow was initiated.",
        id: "auth-started",
        status: "info",
        time: "5m ago",
        title: "Authentication started",
      },
    ],
    id: "more",
  },
  {
    description: "A new session was created for the user.",
    id: "session-created",
    status: "info",
    time: "6m ago",
    title: "Session created",
  },
];

export default function Home() {
  return (
    <div className="flex w-full flex-col items-start gap-12">
      <div>
        <h1 className="font-medium text-foreground text-xl">rocket</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          A small component library distributed as a shadcn registry.
        </p>
      </div>

      <ComponentShowcase
        description="A nested, collapsible event timeline with one continuous connector line."
        name="timeline"
        title="Timeline"
      >
        <Timeline items={timelineItems} />
      </ComponentShowcase>
    </div>
  );
}
```

- [ ] **Step 3: Format + type-check + lint**

Run:
```bash
pnpm biome check --write app/ && pnpm exec tsc --noEmit && pnpm lint
```
Expected: clean.

- [ ] **Step 4: Visual check (manual)**

Run:
```bash
pnpm dev
```
Then open `http://localhost:3000`. Expected: header with "rocket" + theme toggle; the Timeline showcase renders; expand/collapse animates; the connector is **one continuous line with no seams**; toggling theme switches light/dark and the line color follows `--border`. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(docs): landing page with timeline showcase"
```

---

## Task 7: Registry manifest + build wiring

**Files:**
- Create: `registry.json`
- Generated: `public/r/timeline.json`

- [ ] **Step 1: Write `registry.json`**

Create `registry.json` at the repo root:
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "rocket",
  "homepage": "https://rocket.gozturk.dev",
  "items": [
    {
      "name": "timeline",
      "type": "registry:ui",
      "title": "Timeline",
      "description": "A nested, collapsible event timeline with one continuous connector line.",
      "dependencies": ["lucide-react", "motion"],
      "registryDependencies": [],
      "files": [
        {
          "path": "components/ui/timeline.tsx",
          "type": "registry:ui"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Build the registry**

Run:
```bash
pnpm registry:build
```
Expected: writes `public/r/timeline.json` (and possibly `public/r/registry.json` / index). The file contains the component source under `files[].content`, plus `dependencies`.

> If `shadcn build` requires an explicit input/output, use `pnpm dlx shadcn@latest build registry.json --output public/r`. Adjust the `registry:build` script to match whatever the installed CLI expects, then re-run.

- [ ] **Step 3: Verify the generated item**

Run:
```bash
test -f public/r/timeline.json && grep -q "\"name\": \"timeline\"" public/r/timeline.json && grep -q "lucide-react" public/r/timeline.json && echo OK
```
Expected: prints `OK`.

- [ ] **Step 4: Verify it serves over HTTP**

Run (in one shell):
```bash
pnpm dev
```
In another shell:
```bash
curl -sS http://localhost:3000/r/timeline.json | head -c 200; echo
```
Expected: JSON starts with the registry item (e.g. `{"$schema":...,"name":"timeline"...`). Stop the dev server.

- [ ] **Step 5: Add `public/r` handling to gitignore decision**

Decide: build-only (default). Append to `.gitignore`:
```
# generated registry items (built during `pnpm build`)
/public/r
```
> If you prefer to commit generated items (e.g. to `shadcn add` against a static host without building), skip this and `git add public/r` instead. Default is build-only.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(registry): add registry.json and build wiring"
```

---

## Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build**

Run:
```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket && pnpm build
```
Expected: `shadcn build` regenerates `public/r/timeline.json`, then `next build` succeeds with no type/lint errors.

- [ ] **Step 2: Static checks**

Run:
```bash
pnpm lint && pnpm exec tsc --noEmit && grep -rn "p3-" components/ app/; echo "grep-exit=$?"
```
Expected: lint clean, tsc clean, grep finds nothing (`grep-exit=1`).

- [ ] **Step 3: Install smoke test in a throwaway app**

Run:
```bash
# terminal A: serve rocket
cd /Users/gokhanozturk/Desktop/dev/labs/rocket && pnpm dev
```
```bash
# terminal B: fresh consumer app
cd /tmp && pnpm create next-app@latest rocket-consume --ts --tailwind --no-eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --turbopack --disable-git
cd /tmp/rocket-consume && pnpm dlx shadcn@latest init --defaults --yes
pnpm dlx shadcn@latest add http://localhost:3000/r/timeline.json --yes
test -f components/ui/timeline.tsx && echo "INSTALLED"
pnpm exec tsc --noEmit
```
Expected: `INSTALLED` printed; `lucide-react` + `motion` added to the consumer's `package.json`; `tsc --noEmit` passes in the consumer (component compiles against standard shadcn tokens). Clean up `/tmp/rocket-consume` afterward. Stop the rocket dev server.

- [ ] **Step 4: Final commit**

```bash
cd /Users/gokhanozturk/Desktop/dev/labs/rocket
git add -A && git commit -m "chore: verify build, lint, types, and registry install"
```

---

## Deployment (after plan completion — not a coding task)

- Push `rocket` to a Git host and import into Vercel.
- Set `NEXT_PUBLIC_REGISTRY_URL=https://rocket.gozturk.dev` (Production) and the matching preview URL for Preview.
- Point the `rocket.gozturk.dev` DNS/domain at the Vercel project.
- After deploy, confirm `https://rocket.gozturk.dev/r/timeline.json` resolves and `npx shadcn@latest add https://rocket.gozturk.dev/r/timeline.json` works from any project.
```
