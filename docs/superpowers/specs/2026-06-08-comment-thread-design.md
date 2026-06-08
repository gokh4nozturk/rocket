# CommentThread — Design Spec

**Date:** 2026-06-08
**Component:** `components/craft/comment-thread.tsx`
**Registry item:** `comment-thread`

## Purpose

A new craft component for the `rocket` shadcn registry, extending its
activity/collaboration theme (alongside `timeline` and `activity-feed`). It
renders a threaded comment discussion with hybrid (depth-capped) nesting,
avatar-led rows joined by a threading connector, and full interaction: replies,
reactions, and collapsing.

It deliberately reuses the established DNA of the existing two components:
`"use client"`, `motion/react` height animations, `lucide-react` icons, the
`Avatar` primitive, the SSR-safe relative-time helpers, and an internally-managed
state model with sensible prop defaults.

## Data model

```ts
export interface CommentAuthor {
  name: string;
  avatarUrl?: string;
  fallback?: string;
}

export interface CommentReaction {
  emoji: string;      // e.g. "👍"
  count: number;
  reacted?: boolean;  // whether the current user has reacted
}

export interface CommentNode {
  id: string;
  author: CommentAuthor;
  body: string;                  // plain text; @mentions are auto-highlighted
  time: string | number | Date;  // rendered via the SSR-safe timeAgo helper
  reactions?: CommentReaction[];
  replies?: CommentNode[];
  pinned?: boolean;
  edited?: boolean;
}

export interface CommentThreadProps {
  comments: CommentNode[];
  currentUser?: CommentAuthor;          // composer avatar + reaction ownership
  maxDepth?: number;                    // default 2 — deeper replies flatten
  onReply?: (parentId: string, body: string) => void;
  onReact?: (commentId: string, emoji: string) => void;
  className?: string;
}
```

## Behavior & state

The component is **uncontrolled**: it seeds an internal copy of the comment tree
from `comments` once (via `useState` initializer), and all interactions mutate
that internal tree immutably. Optional `onReply` / `onReact` callbacks fire so a
parent can persist changes, but the component works standalone in a registry
demo with no wiring — mirroring how `timeline` owns its `openIds` and
`activity-feed` owns its mounted/live state.

- **Reply:** every comment has a "Reply" button that toggles an inline composer
  (a `textarea` plus a submit button) directly beneath it. Submitting a
  non-empty body inserts a new `CommentNode` under that comment's `replies`,
  authored by `currentUser` (falling back to a generic "You" author when
  `currentUser` is absent), and fires `onReply(parentId, body)`. Empty or
  whitespace-only submissions are ignored. The composer closes on submit or
  cancel.
- **Reactions:** existing reaction chips toggle on click — clicking adjusts
  `count` by ±1 and flips `reacted`. A trailing `+` button opens a small popover
  with a fixed emoji set (`👍 ❤️ 🎉 😄 👀`); choosing one adds or toggles that
  reaction. Every reaction change fires `onReact(commentId, emoji)`.
- **Collapse:** any comment that has replies shows a toggle ("N replies ⌄") that
  expands/collapses its subtree with a `motion` height animation, reusing the
  `AnimatePresence` + `height: auto` pattern already in the repo. Threads start
  expanded.

## Hybrid nesting & connector

Rendering is recursive. While `depth < maxDepth` each reply level indents
further; once `depth` reaches `maxDepth` (default 2), deeper replies render at
that same capped level (flattened) so the thread stays readable — the Reddit-
mobile behavior.

The threading connector is **CSS-based**, not the measured SVG path used by
`timeline`. Each reply column carries a left border, and each avatar gets a short
rounded elbow joining it to that border. This is chosen deliberately over the
timeline's `ResizeObserver`-measured SVG because the comment thread contains an
expandable composer and variable-height bodies; a CSS connector stays correct
across those dynamic height changes with no measurement race, while still
delivering the same visual signature (avatar + threading line).

## Helpers & internal structure

One self-contained file, `components/craft/comment-thread.tsx`. Because registry
components must stand alone (consumers install a single file), the SSR-safe time
helpers are copied from `activity-feed` rather than shared: `useMounted`,
`toDate`, `timeAgo`, and `initials`.

Internal sub-components:

- `Mentions` — splits a body string on `@word` and wraps matches in a styled
  span (medium weight, accent color).
- `ReactionBar` — renders reaction chips + the `+` add button.
- `EmojiPicker` — the small fixed-set popover used by `ReactionBar`.
- `Composer` — the inline `textarea` + submit/cancel used by replies.
- `CommentNodeView` — the recursive row: avatar, header (author · time · edited ·
  pinned badges), body, reaction bar, action buttons, nested replies with the
  depth cap and connector.
- `CommentThread` — the exported root that owns state and maps top-level nodes.

## Edge cases & validation

- Empty `comments` → render nothing.
- Whitespace-only reply submissions are ignored.
- `maxDepth` guards recursion depth; deeper replies flatten rather than indent.
- `pinned` / `edited` render as small inline badges in the header.
- Time rendering is SSR-safe: a stable absolute date on the server / first paint,
  switching to relative ("just now", "3h ago") after mount.

Validation: manual check in the running app plus `biome` lint and `tsc`
typecheck. The repo currently has no test harness; if one is added later, the
pure helpers (`timeAgo`, mention splitting, the tree-update reducers) are the
natural unit-test targets.

## registry.json

Add a new item:

```json
{
  "name": "comment-thread",
  "type": "registry:ui",
  "title": "Comment Thread",
  "description": "A threaded comment discussion with depth-capped nesting, avatar rows, reactions, replies and collapsible subtrees.",
  "dependencies": ["lucide-react", "motion"],
  "registryDependencies": ["avatar"],
  "files": [
    { "path": "components/craft/comment-thread.tsx", "type": "registry:ui" }
  ]
}
```
