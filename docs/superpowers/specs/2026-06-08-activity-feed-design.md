# ActivityFeed — rocket's 2nd component — Design

**Date:** 2026-06-08
**Status:** Approved (design)
**Author:** Gökhan Öztürk (with Claude)

## Summary

`ActivityFeed` is the second component in the `rocket` shadcn registry: an
avatar-led social/activity feed. Each row shows an actor avatar (with a small
event-type badge in its corner), a rich action line (`**Ada** merged #42`), a
relative timestamp, and an optional preview/attachment card (quote, image, or
link). Items are grouped by date (`Today` / `Yesterday` / absolute date). The
newest (or `live`-flagged) item gets a pulsing "now" dot, and new items animate
in when prepended.

It reuses the shadcn `Avatar` primitive (declared as a `registryDependency`, so
`shadcn add` installs it into the consumer too). It uses only standard shadcn
tokens plus raw semantic accent colors, so it themes against any consumer.

## Goals

- A distinctive, motion-aware activity feed that is clearly different from
  `Timeline` (no weaving connector line).
- Installable via `npx shadcn@latest add https://rocket.gozturk.dev/r/activity-feed.json`,
  pulling in the `avatar` dependency automatically.
- TypeScript strict, exported prop/item types, portable tokens.
- Hydration-safe relative time + date grouping.

## Non-Goals

- Real data fetching / pagination / infinite scroll (the component renders the
  `items` it is given). A `live` flag + prepend animation is presentation-only.
- Read/unread state, filtering, or per-item actions/menus.
- A custom theme preset (uses standard shadcn tokens).

## Locked Decisions

| Decision | Choice |
| --- | --- |
| Style | Avatar-led social feed (rich action line + time + optional preview card) |
| Features | Date grouping, live indicator + insertion animation, attachment card, avatar corner type-badge — all included |
| Avatar | Reuse shadcn `Avatar` (registryDependency `avatar`) |
| Tokens | Standard shadcn tokens + raw accent colors (dark variants) |
| Connector line | None (intentionally distinct from Timeline) |
| Attachment kinds | `quote`, `image`, `link` (image via plain `<img>`, not next/image) |
| Date grouping default | `groupByDate` on; `stickyHeaders` off |

## Architecture

Single client component `components/ui/activity-feed.tsx` (mirrors `timeline.tsx`
structure: types → maps/consts → small internal subcomponents → helpers →
exported component). Self-contained helpers (`useMounted`, `timeAgo`,
`dayBucket`) live in the same file to keep the registry item one file +
`registryDependencies`.

### Data model (exported types)

```ts
export type ActivityType =
  | "comment" | "commit" | "merge" | "issue" | "star" | "deploy" | "mention";

export interface ActivityActor {
  name: string;
  avatarUrl?: string;
  fallback?: string; // initials shown when no image; defaults to derived initials
}

export interface ActivityAttachment {
  kind: "quote" | "image" | "link";
  text?: string;     // quote body, or link title
  imageUrl?: string; // image kind
  href?: string;     // link kind
  meta?: string;     // link secondary line (e.g. domain)
  alt?: string;      // image alt
}

export interface ActivityItem {
  id?: string;
  actor: ActivityActor;
  type?: ActivityType;          // drives the avatar corner badge
  icon?: LucideIcon;            // override the badge icon
  action: string;               // "merged", "commented on", ...
  target?: string;              // "#42 Fix timeline connector"
  time: string | number | Date; // ISO/Date/epoch → relative + date bucket; else raw string
  attachment?: ActivityAttachment;
  live?: boolean;               // pulsing "now" dot on this item
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  groupByDate?: boolean;   // default true
  stickyHeaders?: boolean; // default false
}
```

### Type → badge map

`const TYPE_BADGE: Record<ActivityType, { icon: LucideIcon; className: string }>`:
- comment → MessageSquare, `text-sky-500 dark:text-sky-400`
- commit → GitCommit, `text-violet-500 dark:text-violet-400`
- merge → GitMerge, `text-green-600 dark:text-green-400`
- issue → CircleDot, `text-amber-500 dark:text-amber-400`
- star → Star, `text-amber-500 dark:text-amber-400`
- deploy → Rocket, `text-emerald-600 dark:text-emerald-400`
- mention → AtSign, `text-blue-500 dark:text-blue-400`

Fallback when `type`/`icon` absent: Bell, `text-muted-foreground`. The badge is a
small rounded chip (`bg-background border`, `~16px`) absolutely positioned at the
avatar's bottom-right.

### Layout / visual anatomy

- Vertical list, each row: `flex items-start gap-3`.
- Left: `Avatar` (`size-9`) with `AvatarImage`/`AvatarFallback`, plus the
  corner badge span (`absolute -right-1 -bottom-1`).
- Right (`min-w-0 flex-1`): action line + time on the first line; attachment card
  below.
  - Action line: `<span className="font-medium text-foreground">{actor.name}</span>`
    + `<span className="text-muted-foreground"> {action} </span>`
    + optional `<span className="font-medium text-foreground">{target}</span>`.
  - Time: `text-muted-foreground text-xs`, with a pulsing dot before it when `live`.
- Attachment card (`mt-2`):
  - `quote`: `border-l-2 pl-3 text-muted-foreground text-sm` (italic body).
  - `image`: `<img>` `rounded-lg border max-h-48 object-cover`.
  - `link`: `rounded-lg border bg-muted/40 p-3` → title (`text-foreground text-sm
    font-medium`) + `meta` (`text-muted-foreground text-xs`); wraps in `<a href>`
    when `href` present.

### Date grouping

- When `groupByDate`, items render under group headers in their given order
  (the component does not re-sort; it assumes items are newest-first and buckets
  consecutively). A header label is computed per item's `time`:
  - parse `time` → `Date`; if unparseable, items go in a single ungrouped list.
  - bucket label: `Today` / `Yesterday` (only after mount) else absolute
    `Intl.DateTimeFormat` short date (e.g. `Jun 5`).
- Header: `text-muted-foreground text-xs font-medium uppercase tracking-wide`,
  `mb-3 mt-6 first:mt-0`. With `stickyHeaders`: `sticky top-0 bg-background py-1`.

### Hydration safety

`useMounted()` returns `false` on server + first client render, `true` after a
mount effect. Relative labels that depend on "now":
- `timeAgo(time)` → `just now` / `2m ago` / `3h ago` / `5d ago`, else absolute
  short date. Before mount → absolute short date/time (stable).
- `Today`/`Yesterday` group labels → only when mounted; before mount → absolute
  date. Absolute dates are identical server/client for the same input, so no
  mismatch; the top groups/times "upgrade" to relative after mount.

### Live indicator + animation (motion)

- Pulsing dot: a `relative` 6px dot — a static `bg-green-500` circle with an
  overlaid `animate-ping` ring — shown for items with `live` (or, if no item is
  flagged, the first item).
- Insertion animation: wrap each row in `AnimatePresence`/`motion.div`
  (`initial={{ opacity: 0, y: -8, height: 0 }}`, `animate={{ opacity: 1, y: 0,
  height: "auto" }}`, `exit={{ opacity: 0, height: 0 }}`, `transition duration
  0.2 easeOut`), keyed by `item.id ?? index`. Prepending a new item animates it in.

## Registry & docs integration

- `registry.json`: add an item
  ```jsonc
  {
    "name": "activity-feed",
    "type": "registry:ui",
    "title": "Activity Feed",
    "description": "An avatar-led activity feed with type badges, attachments, date grouping and a live indicator.",
    "dependencies": ["lucide-react", "motion"],
    "registryDependencies": ["avatar"],
    "files": [{ "path": "components/ui/activity-feed.tsx", "type": "registry:ui" }]
  }
  ```
- Install shadcn `avatar` into rocket (`pnpm dlx shadcn@latest add avatar`) so the
  source's `@/components/ui/avatar` import resolves and the docs page renders.
- `app/page.tsx`: add a second `ComponentShowcase` (name `activity-feed`) with
  sample activity data below the Timeline showcase.
- `pnpm build` regenerates `public/r/activity-feed.json` (+ the `r/registry.json`
  index) automatically.

## Verification

- `pnpm build` succeeds; `public/r/activity-feed.json` exists with
  `registryDependencies: ["avatar"]` and inlined source.
- `pnpm lint` + `pnpm exec tsc --noEmit` clean.
- `grep -rn "p3-" components/ app/` finds nothing.
- Manual (Playwright): docs `/` renders the feed in light + dark; avatars + corner
  badges show; date group headers present; the live dot pulses; attachment kinds
  render.
- Smoke test: serve `public/` and
  `npx shadcn@latest add http://localhost:PORT/r/activity-feed.json` into a fresh
  app installs `activity-feed.tsx` **and** the `avatar` component, and the consumer
  `tsc --noEmit` passes.

## Future (out of scope)

- Pagination / "show earlier" collapse, filtering, read state, per-item menus.
- Additional attachment kinds (reactions, multi-image galleries).
