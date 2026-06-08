# Sidebar Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-scroll component showcase with a docs-style left sidebar where each component lives on its own route, and remove the duplicate "rocket" heading.

**Architecture:** A central `lib/showcase.tsx` registry holds every component's slug, title, description, registry name, and demo node. The layout renders a persistent sidebar (brand + nav + theme toggle) driven by that registry; a dynamic `app/[component]/page.tsx` route renders one `ComponentShowcase` per slug; `app/page.tsx` becomes a short intro listing the components.

**Tech Stack:** Next.js 16 (App Router, async `params`, `generateStaticParams`), React 19, Tailwind v4, shiki (existing `getComponentSource`), shadcn primitives.

> **Note on commits:** This repo's convention (user memory) is **no auto-commit** — do not run `git commit`/`git push` unless the user explicitly asks. The commit steps below are written for completeness; when executing, skip them or ask the user first.

> **Note on verification:** This project has no unit-test framework. Verification is done with `pnpm build` (or `npx next build`) and the dev server (`pnpm dev`), checking routes render correctly. The plan uses these instead of `pytest`-style unit tests.

---

## File Structure

| File | Responsibility | Create / Modify |
|------|----------------|-----------------|
| `lib/showcase.tsx` | Single source of truth: entries (slug, title, description, registryName, demo) + `getEntry`/`getSlugs` helpers + demo data | **Create** |
| `components/showcase/sidebar-nav.tsx` | Client island: nav list with active-route highlight | **Create** |
| `app/layout.tsx` | Shell: sidebar (brand + nav + ModeToggle) + main | **Modify** |
| `app/page.tsx` | Intro copy + component list | **Modify** (replace contents) |
| `app/[component]/page.tsx` | One component per route via dynamic segment | **Create** |

Demo data (`timelineItems`, `activityItems`, `comments`, `min()`) currently inlined in `app/page.tsx` moves into `lib/showcase.tsx`.

---

## Task 1: Create the central showcase registry

**Files:**
- Create: `lib/showcase.tsx`

- [ ] **Step 1: Create `lib/showcase.tsx` with the type, demo data, entries, and helpers**

Move the demo data out of `app/page.tsx` and co-locate it with each entry. Full file:

```tsx
import { ActivityFeed, type ActivityItem } from "@/components/craft/activity-feed";
import { type CommentNode, CommentThread } from "@/components/craft/comment-thread";
import { Timeline, type TimelineItem } from "@/components/craft/timeline";

export type ShowcaseEntry = {
  /** Route segment, e.g. "timeline". */
  slug: string;
  /** Display title, e.g. "Timeline". */
  title: string;
  /** Shown above the component. */
  description: string;
  /** Passed to getComponentSource() — the craft file name. */
  registryName: string;
  /** Rendered example. */
  demo: React.ReactNode;
};

const min = (m: number) => new Date(Date.now() - m * 60_000);

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

const activityItems: ActivityItem[] = [
  {
    action: "merged",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    attachment: { kind: "quote", text: "Single SVG path — no more seams between rows." },
    id: "act-merge",
    live: true,
    target: "#42 Fix timeline connector",
    time: min(2),
    type: "merge",
  },
  {
    action: "pushed 3 commits to",
    actor: { name: "Linus Park" },
    id: "act-commit",
    target: "main",
    time: min(48),
    type: "commit",
  },
  {
    action: "commented on",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
      name: "Grace Hopper",
    },
    attachment: {
      href: "https://rocket.gozturk.dev",
      kind: "link",
      meta: "rocket.gozturk.dev",
      text: "rocket — component registry",
    },
    id: "act-comment",
    target: "#39 Docs site",
    time: min(90),
    type: "comment",
  },
  {
    action: "starred",
    actor: { name: "Margaret Hamilton" },
    id: "act-star",
    target: "gozturk/rocket",
    time: min(60 * 26),
    type: "star",
  },
  {
    action: "deployed",
    actor: { name: "Katherine Johnson" },
    id: "act-deploy",
    target: "production",
    time: min(60 * 27),
    type: "deploy",
  },
];

const comments: CommentNode[] = [
  {
    author: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    body: "Shipped the new connector — it's one continuous path now, no seams between rows. @grace can you sanity-check the mobile spacing?",
    edited: true,
    id: "c1",
    pinned: true,
    reactions: [
      { count: 4, emoji: "👍", reacted: true },
      { count: 2, emoji: "🎉" },
    ],
    replies: [
      {
        author: {
          avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
          name: "Grace Hopper",
        },
        body: "Looks great. One nit: the elbow radius feels a touch tight at the narrowest breakpoint.",
        id: "c1-1",
        reactions: [{ count: 1, emoji: "👀" }],
        replies: [
          {
            author: {
              avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
              name: "Ada Lovelace",
            },
            body: "Good catch — bumping it to 12px. This reply is flattened since it's past the depth cap.",
            id: "c1-1-1",
            time: min(20),
          },
          {
            author: { name: "Linus Park" },
            body: "+1, reads much cleaner now.",
            id: "c1-1-2",
            time: min(8),
          },
        ],
        time: min(40),
      },
    ],
    time: min(120),
  },
  {
    author: { name: "Margaret Hamilton" },
    body: "Should reactions persist to the server in this demo, or stay local for now?",
    id: "c2",
    time: min(15),
  },
];

export const showcaseEntries: ShowcaseEntry[] = [
  {
    slug: "timeline",
    title: "Timeline",
    description: "A nested, collapsible event timeline with one continuous connector line.",
    registryName: "timeline",
    demo: <Timeline items={timelineItems} />,
  },
  {
    slug: "activity-feed",
    title: "Activity Feed",
    description:
      "An avatar-led activity feed with type badges, attachments, date grouping and a live indicator.",
    registryName: "activity-feed",
    demo: <ActivityFeed items={activityItems} />,
  },
  {
    slug: "comment-thread",
    title: "Comment Thread",
    description:
      "A threaded comment discussion with depth-capped nesting, avatar rows, reactions, replies and collapsible subtrees.",
    registryName: "comment-thread",
    demo: <CommentThread comments={comments} currentUser={{ name: "Katherine Johnson" }} />,
  },
];

export function getEntry(slug: string): ShowcaseEntry | undefined {
  return showcaseEntries.find((entry) => entry.slug === slug);
}

export function getSlugs(): string[] {
  return showcaseEntries.map((entry) => entry.slug);
}
```

- [ ] **Step 2: Verify it typechecks / lints**

Run: `npx biome check lib/showcase.tsx`
Expected: no errors (warnings about import order are auto-fixable with `--write`).

- [ ] **Step 3: Commit** (skip unless user asked — see commit note)

```bash
git add lib/showcase.tsx
git commit -m "feat: add central showcase registry"
```

---

## Task 2: Create the sidebar nav client island

**Files:**
- Create: `components/showcase/sidebar-nav.tsx`

- [ ] **Step 1: Create `components/showcase/sidebar-nav.tsx`**

Client component — highlights the active route via `usePathname`. It receives plain
`{ slug, title }[]` items (NOT the full entries, since `demo` is a server-rendered
node and must not cross into a client component).

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SidebarNavItem = { slug: string; title: string };

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const href = `/${item.slug}`;
        const active = pathname === href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={href}
            key={item.slug}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verify it lints**

Run: `npx biome check components/showcase/sidebar-nav.tsx`
Expected: no errors.

- [ ] **Step 3: Commit** (skip unless user asked)

```bash
git add components/showcase/sidebar-nav.tsx
git commit -m "feat: add sidebar nav with active-route highlight"
```

---

## Task 3: Rebuild the layout with a persistent sidebar

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/layout.tsx` body with the sidebar shell**

Removes the old top header. Brand + nav + ModeToggle live in the sidebar; content
sits to the right. Mobile: sidebar stacks on top (basic responsive, no drawer).

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarNav } from "@/components/showcase/sidebar-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { showcaseEntries } from "@/lib/showcase";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  description: "A small, distinctive component library distributed as a shadcn registry.",
  title: "rocket",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navItems = showcaseEntries.map((entry) => ({ slug: entry.slug, title: entry.title }));

  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
            <aside className="flex shrink-0 flex-col gap-6 border-b px-6 py-6 md:h-screen md:w-56 md:border-r md:border-b-0">
              <Link className="font-semibold text-foreground" href="/">
                rocket
              </Link>
              <SidebarNav items={navItems} />
              <div className="mt-auto">
                <ModeToggle />
              </div>
            </aside>
            <main className="min-w-0 flex-1 px-6 py-12">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify it lints**

Run: `npx biome check app/layout.tsx`
Expected: no errors.

---

## Task 4: Turn `app/page.tsx` into the intro page

**Files:**
- Modify: `app/page.tsx` (replace entire contents)

- [ ] **Step 1: Replace `app/page.tsx` with the intro + component list**

All the demo data and `ComponentShowcase` rendering is gone (moved to the registry
and the dynamic route). This is now a small server component.

```tsx
import Link from "next/link";
import { showcaseEntries } from "@/lib/showcase";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-start gap-8">
      <div>
        <h1 className="font-medium text-foreground text-xl">rocket</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          A small component library distributed as a shadcn registry.
        </p>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {showcaseEntries.map((entry) => (
          <li key={entry.slug}>
            <Link
              className="block rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
              href={`/${entry.slug}`}
            >
              <span className="font-medium text-foreground text-sm">{entry.title}</span>
              <span className="mt-1 block text-muted-foreground text-sm">{entry.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify it lints**

Run: `npx biome check app/page.tsx`
Expected: no errors.

---

## Task 5: Create the dynamic component route

**Files:**
- Create: `app/[component]/page.tsx`

- [ ] **Step 1: Create `app/[component]/page.tsx`**

`params` is a `Promise` in Next 16 — await it. `generateStaticParams` pre-renders
every slug; unknown slugs → `notFound()`.

```tsx
import { notFound } from "next/navigation";
import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { getComponentSource } from "@/lib/registry-source";
import { getEntry, getSlugs } from "@/lib/showcase";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ component: slug }));
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component } = await params;
  const entry = getEntry(component);

  if (!entry) {
    notFound();
  }

  const source = await getComponentSource(entry.registryName);

  return (
    <ComponentShowcase
      code={source.code}
      description={entry.description}
      highlightedCode={source.html}
      name={entry.registryName}
      title={entry.title}
    >
      {entry.demo}
    </ComponentShowcase>
  );
}
```

- [ ] **Step 2: Verify it lints**

Run: `npx biome check "app/[component]/page.tsx"`
Expected: no errors.

- [ ] **Step 3: Commit layout + pages** (skip unless user asked)

```bash
git add app/layout.tsx app/page.tsx "app/[component]/page.tsx"
git commit -m "feat: sidebar layout with per-component routes"
```

---

## Task 6: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Lint the whole project**

Run: `npx biome check .`
Expected: no errors. Auto-fix import ordering if needed: `npx biome check --write .`

- [ ] **Step 2: Production build**

Run: `npx next build`
Expected: build succeeds. In the route summary, confirm `/`, `/[component]` appear
and that `/timeline`, `/activity-feed`, `/comment-thread` are statically generated
(SSG) via `generateStaticParams`.

- [ ] **Step 3: Manual smoke test on the dev server**

Run: `pnpm dev` (or `npx next dev --turbopack`), then check in the browser:
- `/` shows the intro + three component cards; each links to its route.
- `/timeline`, `/activity-feed`, `/comment-thread` each render exactly one
  component with the correct title/description.
- Preview/Code tabs and both copy buttons (install command + source) still work.
- Sidebar highlights the active route; clicking `rocket` returns to `/`.
- A bogus URL like `/nope` returns 404.
- The duplicate "rocket" heading is gone (brand appears once, in the sidebar; the
  `/` intro h1 is the only other "rocket" and is expected).
- Toggle light/dark — sidebar, cards, and highlighted code all adapt.

- [ ] **Step 4: Commit any lint fixes** (skip unless user asked)

```bash
git add -A
git commit -m "chore: lint pass for sidebar showcase"
```

---

## Self-Review Notes

- **Spec coverage:** registry (Task 1) ✓, sidebar layout + client island (Tasks 2–3) ✓,
  intro `/` (Task 4) ✓, real routes + `notFound` + `generateStaticParams` (Task 5) ✓,
  duplicate heading removed (Task 3 drops the old header; Task 4 keeps a single intro h1) ✓,
  verification (Task 6) ✓. `ComponentShowcase` and `craft/*` untouched ✓.
- **Type consistency:** `ShowcaseEntry`, `getEntry`, `getSlugs`, `showcaseEntries`,
  `SidebarNav`/`SidebarNavItem` names match across tasks. Dynamic segment is
  `[component]`, and `generateStaticParams` returns `{ component: slug }` to match.
- **Out of scope (unchanged):** no search/command palette, no mobile drawer, no MDX docs.
```
