# Sidebar Showcase — Design

## Problem

The showcase page (`app/page.tsx`) stacks every component vertically on a single
scroll. Two issues:

1. **Duplicate branding** — the top header (`app/layout.tsx`) shows "rocket", and
   the page repeats it as an `<h1>` + description right below. Redundant.
2. **Doesn't scale** — one growing scroll page gets tiring as the registry adds
   components.

## Goal

Move to a docs-style layout: a persistent left sidebar lists the components, the
right side shows a single selected component, each on its own real route.

## Decisions

- **Layout:** left sidebar + single-component content area.
- **Routing:** real routes (`/timeline`, `/activity-feed`, `/comment-thread`),
  not client state. Shareable links, working back/forward, server-rendered code
  highlighting.
- **Home (`/`):** a short intro (the "rocket — A small component library…" copy)
  plus a list of components linking into them.
- The repeated top header `<h1>`/description goes away.

## Architecture

### 1. Central showcase registry — `lib/showcase.tsx`

One source of truth that drives both the sidebar nav and the routes. An array of
entries:

```ts
type ShowcaseEntry = {
  slug: string;            // "timeline" — also the route segment
  title: string;           // "Timeline"
  description: string;     // shown above the component
  registryName: string;   // passed to getComponentSource()
  demo: React.ReactNode;   // the rendered example
};
```

The demo data currently inlined in `page.tsx` (`timelineItems`, `activityItems`,
`comments`, and the `min()` helper) moves here, co-located with its entry's
`demo`. Adding a new component to the site becomes: add one entry.

Because entries hold JSX, the file is `.tsx`. Demo data may use `Date.now()`
(e.g. `min()`) — entries are constructed at module load on the server, which is
fine for these server-rendered routes.

Helpers exported alongside the array: `getEntry(slug)` and `getSlugs()`.

### 2. Layout — `app/layout.tsx`

Replace the separate top header with a persistent left sidebar:

- Top: `rocket` brand, links to `/`.
- Middle: nav list mapped from the showcase registry. The active item is
  highlighted via `usePathname` — this is a small **client island**
  (`components/showcase/sidebar-nav.tsx`); the rest of the layout stays a server
  component.
- Bottom: `ModeToggle` (moved out of the old header).

The content area is `<main>` to the right of the sidebar. On mobile the sidebar
collapses to a simple horizontal/stacked bar at the top — kept intentionally
basic; no drawer/overlay for v1.

### 3. Routes

- `app/page.tsx` — intro. The "rocket — A small component library distributed as
  a shadcn registry." copy plus a list/cards of the components linking to each
  route.
- `app/[component]/page.tsx` — dynamic route. Looks up the entry by slug; if none,
  `notFound()`. Otherwise calls `getComponentSource(entry.registryName)` and
  renders a single `ComponentShowcase` with `entry.demo` as children.
  `generateStaticParams` returns `getSlugs()` so the routes are statically
  generated.

### 4. Unchanged

- `components/showcase/component-showcase.tsx` — same component, now rendered once
  per page instead of three times stacked. No title-repetition problem.
- `components/craft/*` — untouched.
- `lib/registry-source.ts` — `getComponentSource` used as-is.

## Components / boundaries

| Unit | Purpose | Depends on |
|------|---------|------------|
| `lib/showcase.tsx` | Single source of components + demo data | craft components, registry types |
| `components/showcase/sidebar-nav.tsx` (client) | Render nav list, highlight active route | `usePathname`, showcase registry |
| `app/layout.tsx` | Shell: sidebar + main | sidebar-nav, ModeToggle |
| `app/page.tsx` | Intro + component list | showcase registry |
| `app/[component]/page.tsx` | One component per route | showcase registry, getComponentSource, ComponentShowcase |

## Data flow

`lib/showcase.tsx` (entries) → consumed by sidebar-nav (titles/slugs), the intro
page (titles/descriptions/slugs), and the dynamic route (full entry →
`getComponentSource` → `ComponentShowcase`).

## Error handling

- Unknown slug → `notFound()` (404).
- `generateStaticParams` ensures only valid slugs are pre-rendered.

## Testing / verification

- Each route (`/`, `/timeline`, `/activity-feed`, `/comment-thread`) renders, the
  correct component shows, Preview/Code toggle and copy still work.
- Sidebar highlights the active route; brand links home.
- An unknown route returns 404.
- No more duplicate "rocket" heading.

## Out of scope (YAGNI)

- Search / command palette in the sidebar.
- Mobile drawer/overlay (basic responsive only).
- Per-component MDX docs pages.
