# CommentThread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `comment-thread` craft component to the rocket shadcn registry — a threaded discussion with depth-capped (hybrid) nesting, avatar rows joined by a CSS threading connector, reactions, inline replies, and collapsible subtrees.

**Architecture:** One self-contained client component file `components/craft/comment-thread.tsx`, mirroring the conventions of `timeline.tsx` and `activity-feed.tsx` (`"use client"`, `motion/react` height animations, `lucide-react`, the `Avatar` primitive, SSR-safe time helpers). State is internal/uncontrolled: the tree is seeded from props and mutated immutably; optional `onReply`/`onReact` callbacks notify a parent. A demo is wired into `app/page.tsx` and the item is registered in `registry.json`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, `motion`, `lucide-react`, shadcn registry, Biome (lint/format).

> **⚠️ Commit policy (user rule `no-auto-commit`):** Do NOT run `git commit` automatically. Each task's final step stages the files; only run the shown `git commit` command after the user explicitly gives the go-ahead.

> **Testing note:** This repo has no unit-test harness, and adding one for a purely visual registry component is out of scope (YAGNI). Verification is therefore: `npx tsc --noEmit` (types), `npm run lint` (Biome), `npm run registry:build` (registry validity), and a visual check in the running app. The pure helpers (`timeAgo`, `Mentions` splitting, `toggleReaction`, `addReply`) are the natural unit-test targets if a runner (e.g. vitest) is added later.

> **Biome note:** Biome here enforces alphabetically-sorted object keys and JSX props. Keep all object literals and JSX attributes alphabetized (as the existing components are) so `npm run lint` passes.

---

## File Structure

- **Create:** `components/craft/comment-thread.tsx` — the entire component (types, helpers, tree utilities, leaf sub-components, recursive node view, exported `CommentThread`). One file because registry consumers install exactly one file.
- **Modify:** `app/page.tsx` — add demo data and a `ComponentShowcase` block.
- **Modify:** `registry.json` — add the `comment-thread` item.

---

## Task 1: Types, helpers, and tree utilities

**Files:**
- Create: `components/craft/comment-thread.tsx`

- [ ] **Step 1: Create the file with types, helpers, tree utilities, and a stub export**

```tsx
"use client";

import { ChevronDown, Pin, Reply, SmilePlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface CommentAuthor {
  name: string;
  avatarUrl?: string;
  fallback?: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface CommentNode {
  id: string;
  author: CommentAuthor;
  body: string;
  time: string | number | Date;
  reactions?: CommentReaction[];
  replies?: CommentNode[];
  pinned?: boolean;
  edited?: boolean;
}

export interface CommentThreadProps {
  comments: CommentNode[];
  currentUser?: CommentAuthor;
  maxDepth?: number;
  onReply?: (parentId: string, body: string) => void;
  onReact?: (commentId: string, emoji: string) => void;
  className?: string;
}

const EMOJI_SET = ["👍", "❤️", "🎉", "😄", "👀"];

/** False on the server and first client render, true after mount. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const shortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(d);

/** Relative time once mounted; stable absolute date on server / first paint. */
function timeAgo(value: string | number | Date, mounted: boolean): string {
  const d = toDate(value);
  if (!d) return typeof value === "string" ? value : "";
  if (!mounted) return shortDate(d);
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(d);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Total number of descendant replies under a node. */
function countDescendants(node: CommentNode): number {
  return (node.replies ?? []).reduce((sum, r) => sum + 1 + countDescendants(r), 0);
}

/** Immutably apply `fn` to the node with `id`, anywhere in the tree. */
function mapTree(
  nodes: CommentNode[],
  id: string,
  fn: (n: CommentNode) => CommentNode,
): CommentNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    if (n.replies?.length) return { ...n, replies: mapTree(n.replies, id, fn) };
    return n;
  });
}

/** Toggle the current user's reaction for `emoji` on a node. */
function toggleReaction(node: CommentNode, emoji: string): CommentNode {
  const existing = node.reactions ?? [];
  const idx = existing.findIndex((r) => r.emoji === emoji);
  if (idx === -1) {
    return { ...node, reactions: [...existing, { count: 1, emoji, reacted: true }] };
  }
  const target = existing[idx];
  const nextCount = target.reacted ? target.count - 1 : target.count + 1;
  const reactions = existing
    .map((r, i) => (i === idx ? { ...r, count: nextCount, reacted: !target.reacted } : r))
    .filter((r) => r.count > 0);
  return { ...node, reactions };
}

/** Append a reply under a node. */
function addReply(node: CommentNode, reply: CommentNode): CommentNode {
  return { ...node, replies: [...(node.replies ?? []), reply] };
}

export function CommentThread(_props: CommentThreadProps) {
  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`_props` is intentionally unused for now; the leading underscore satisfies Biome's unused-parameter rule.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors for `components/craft/comment-thread.tsx`.

- [ ] **Step 4: Stage (commit only after user approval)**

```bash
git add components/craft/comment-thread.tsx
git commit -m "feat: scaffold CommentThread types, helpers and tree utilities"
```

---

## Task 2: Leaf sub-components (Mentions, ReactionBar, EmojiPicker, Composer)

**Files:**
- Modify: `components/craft/comment-thread.tsx`

- [ ] **Step 1: Insert the leaf sub-components immediately above the `CommentThread` stub**

Place this block right before `export function CommentThread`:

```tsx
/** Render a body string, highlighting @mentions. */
function Mentions({ body }: { body: string }) {
  const parts = body.split(/(@[\w-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span className="font-medium text-primary" key={`${i}-${part}`}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-full border bg-background p-1 shadow-sm">
      {EMOJI_SET.map((emoji) => (
        <button
          className="flex size-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-muted"
          key={emoji}
          onClick={() => onPick(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: CommentReaction[];
  onToggle: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            r.reacted
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "bg-background text-muted-foreground hover:text-foreground",
          )}
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          type="button"
        >
          <span>{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          aria-label="Add reaction"
          className="flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setPickerOpen((v) => !v)}
          type="button"
        >
          <SmilePlus className="size-3.5" />
        </button>
        {pickerOpen && (
          <EmojiPicker
            onPick={(emoji) => {
              onToggle(emoji);
              setPickerOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Composer({
  author,
  onCancel,
  onSubmit,
}: {
  author: CommentAuthor;
  onCancel: () => void;
  onSubmit: (body: string) => void;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };
  return (
    <div className="mt-2 flex items-start gap-2">
      <Avatar className="size-7 shrink-0">
        {author.avatarUrl && <AvatarImage alt={author.name} src={author.avatarUrl} />}
        <AvatarFallback>{author.fallback ?? initials(author.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <textarea
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Write a reply…"
          rows={2}
          value={value}
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground text-xs disabled:opacity-50"
            disabled={!value.trim()}
            onClick={submit}
            type="button"
          >
            Reply
          </button>
          <button
            className="rounded-md px-3 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Stage (commit only after user approval)**

```bash
git add components/craft/comment-thread.tsx
git commit -m "feat: add CommentThread leaf sub-components"
```

---

## Task 3: Recursive node view + stateful root

**Files:**
- Modify: `components/craft/comment-thread.tsx`

- [ ] **Step 1: Add the `NodeCtx` interface and `CommentNodeView`, then replace the `CommentThread` stub**

Insert `NodeCtx` + `CommentNodeView` immediately above `export function CommentThread`, then replace the stub `export function CommentThread(_props: CommentThreadProps) { return null; }` with the real implementation below.

```tsx
interface NodeCtx {
  collapsed: Set<string>;
  currentUser: CommentAuthor;
  maxDepth: number;
  mounted: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply: (parentId: string, body: string) => void;
  onToggleCollapse: (id: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
}

function CommentNodeView({ ctx, depth, node }: { ctx: NodeCtx; depth: number; node: CommentNode }) {
  const replies = node.replies ?? [];
  const hasReplies = replies.length > 0;
  const isCollapsed = ctx.collapsed.has(node.id);
  const indentChildren = depth < ctx.maxDepth;
  const total = countDescendants(node);

  return (
    <div className="relative">
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          {node.author.avatarUrl && <AvatarImage alt={node.author.name} src={node.author.avatarUrl} />}
          <AvatarFallback>{node.author.fallback ?? initials(node.author.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium text-foreground text-sm">{node.author.name}</span>
            {node.pinned && (
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Pin className="size-3" />
                Pinned
              </span>
            )}
            <span className="text-muted-foreground text-xs">{timeAgo(node.time, ctx.mounted)}</span>
            {node.edited && <span className="text-muted-foreground text-xs">· edited</span>}
          </div>

          <p className="mt-0.5 whitespace-pre-wrap text-foreground text-sm leading-snug">
            <Mentions body={node.body} />
          </p>

          <ReactionBar
            onToggle={(emoji) => ctx.onReact(node.id, emoji)}
            reactions={node.reactions ?? []}
          />

          <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
            <button
              className="flex items-center gap-1 transition-colors hover:text-foreground"
              onClick={() => ctx.setReplyingTo(ctx.replyingTo === node.id ? null : node.id)}
              type="button"
            >
              <Reply className="size-3.5" />
              Reply
            </button>
            {hasReplies && (
              <button
                aria-expanded={!isCollapsed}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
                onClick={() => ctx.onToggleCollapse(node.id)}
                type="button"
              >
                <ChevronDown
                  className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")}
                />
                {total} {total === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {ctx.replyingTo === node.id && (
            <Composer
              author={ctx.currentUser}
              onCancel={() => ctx.setReplyingTo(null)}
              onSubmit={(body) => ctx.onReply(node.id, body)}
            />
          )}
        </div>
      </div>

      {hasReplies && (
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key="replies"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {indentChildren ? (
                <div className="relative mt-1 ml-4 border-border border-l pl-5">
                  {replies.map((child) => (
                    <div className="relative pt-3" key={child.id}>
                      <span
                        aria-hidden
                        className="absolute -left-5 top-0 h-7 w-5 rounded-bl-[10px] border-border border-b border-l"
                      />
                      <CommentNodeView ctx={ctx} depth={depth + 1} node={child} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {replies.map((child) => (
                    <CommentNodeView ctx={ctx} depth={depth} key={child.id} node={child} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * CommentThread — a threaded comment discussion. Replies nest with a CSS
 * threading connector up to `maxDepth`, then flatten. Each comment supports
 * reactions, an inline reply composer, and a collapsible subtree. State is
 * internal (seeded from `comments`); `onReply` / `onReact` notify a parent.
 */
export function CommentThread({
  comments,
  currentUser,
  maxDepth = 2,
  onReply,
  onReact,
  className,
}: CommentThreadProps) {
  const mounted = useMounted();
  const [tree, setTree] = useState<CommentNode[]>(() => comments);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const idCounter = useRef(0);

  const me: CommentAuthor = currentUser ?? { name: "You" };

  const handleReact = (id: string, emoji: string) => {
    setTree((prev) => mapTree(prev, id, (n) => toggleReaction(n, emoji)));
    onReact?.(id, emoji);
  };

  const handleReply = (parentId: string, body: string) => {
    idCounter.current += 1;
    const reply: CommentNode = {
      author: me,
      body,
      id: `reply-${idCounter.current}`,
      time: new Date(),
    };
    setTree((prev) => mapTree(prev, parentId, (n) => addReply(n, reply)));
    setReplyingTo(null);
    onReply?.(parentId, body);
  };

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (tree.length === 0) return null;

  const ctx: NodeCtx = {
    collapsed,
    currentUser: me,
    maxDepth,
    mounted,
    onReact: handleReact,
    onReply: handleReply,
    onToggleCollapse: toggleCollapse,
    replyingTo,
    setReplyingTo,
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {tree.map((node) => (
        <CommentNodeView ctx={ctx} depth={0} key={node.id} node={node} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. (If Biome flags `new Date()` or `Date.now()` — it will not; `activity-feed.tsx` already uses both.)

- [ ] **Step 4: Stage (commit only after user approval)**

```bash
git add components/craft/comment-thread.tsx
git commit -m "feat: implement CommentThread recursive view and stateful root"
```

---

## Task 4: Wire the demo into the home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the import**

Add this import alongside the existing craft imports near the top of `app/page.tsx` (after the `ActivityFeed` import on line 2):

```tsx
import { CommentThread, type CommentNode } from "@/components/craft/comment-thread";
```

- [ ] **Step 2: Add demo data**

Insert this after the `activityItems` array (after its closing `];`, before `export default function Home()`). It reuses the existing `min(...)` helper already defined in the file:

```tsx
const comments: CommentNode[] = [
  {
    author: { avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4", name: "Ada Lovelace" },
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
        author: { avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4", name: "Grace Hopper" },
        body: "Looks great. One nit: the elbow radius feels a touch tight at the narrowest breakpoint.",
        id: "c1-1",
        reactions: [{ count: 1, emoji: "👀" }],
        replies: [
          {
            author: { avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4", name: "Ada Lovelace" },
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
```

- [ ] **Step 3: Add the showcase block**

Inside the returned JSX of `Home`, add this `ComponentShowcase` after the `activity-feed` showcase block (before the closing `</div>`):

```tsx
      <ComponentShowcase
        description="A threaded comment discussion with depth-capped nesting, avatar rows, reactions, replies and collapsible subtrees."
        name="comment-thread"
        title="Comment Thread"
      >
        <CommentThread comments={comments} currentUser={{ name: "Katherine Johnson" }} />
      </ComponentShowcase>
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Visual verification in the running app**

Run the dev server in the background: `npm run dev` (serves on http://localhost:3000).

Then drive a browser (Playwright MCP `browser_navigate` to `http://localhost:3000`, or open it manually) and confirm, taking a screenshot:
- The "Comment Thread" showcase renders below "Activity Feed".
- Ada's root comment shows the "Pinned" badge, "· edited", reaction chips (👍 4 highlighted, 🎉 2), and the `@grace` mention is accent-colored.
- Grace's reply is indented under Ada with a threading connector (vertical line + rounded elbow into the avatar).
- The two deepest replies (`c1-1-1`, `c1-1-2`) render flattened at the same indent as Grace's reply (depth cap = 2), NOT further indented.
- Clicking "3 replies" on Ada's comment collapses/expands her subtree with a height animation.
- Clicking "Reply" opens an inline composer; typing text and pressing the Reply button inserts a new reply authored by "Katherine Johnson" and closes the composer.
- Clicking a reaction chip toggles its count/highlight; the `+` button opens the emoji picker and adding one inserts a new chip.

If the elbow connector is off by a pixel or two (avatar centers not perfectly met), tune the connector span's `h-7` / `w-5` / `-left-5` / `rounded-bl-[10px]` and the container's `ml-4` / `pl-5` until the line meets each avatar's vertical center cleanly. Re-screenshot to confirm.

- [ ] **Step 6: Stage (commit only after user approval)**

```bash
git add app/page.tsx components/craft/comment-thread.tsx
git commit -m "feat: showcase CommentThread on the home page"
```

---

## Task 5: Register in the shadcn registry

**Files:**
- Modify: `registry.json`

- [ ] **Step 1: Add the registry item**

Add this object to the `items` array in `registry.json`, after the existing `activity-feed` item (mind the comma after the `activity-feed` item's closing `}`):

```json
    {
      "name": "comment-thread",
      "type": "registry:ui",
      "title": "Comment Thread",
      "description": "A threaded comment discussion with depth-capped nesting, avatar rows, reactions, replies and collapsible subtrees.",
      "dependencies": ["lucide-react", "motion"],
      "registryDependencies": ["avatar"],
      "files": [
        {
          "path": "components/craft/comment-thread.tsx",
          "type": "registry:ui"
        }
      ]
    }
```

- [ ] **Step 2: Build the registry**

Run: `npm run registry:build`
Expected: completes without error and emits the `comment-thread` registry output (a `public/r/comment-thread.json` file, matching how `timeline` and `activity-feed` are emitted).

- [ ] **Step 3: Verify the emitted registry file exists**

Run: `ls public/r/comment-thread.json`
Expected: the file is listed.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Stage (commit only after user approval)**

```bash
git add registry.json public/r
git commit -m "feat: register comment-thread in the shadcn registry"
```

---

## Self-Review

**Spec coverage:**
- Data model (CommentAuthor/Reaction/Node + props) → Task 1. ✅
- Uncontrolled internal state + `onReply`/`onReact` callbacks → Task 3 (`CommentThread`). ✅
- Reply composer, empty-submit ignored, `currentUser`/"You" fallback → Task 2 (`Composer`) + Task 3 (`handleReply`). ✅
- Reactions toggle + fixed emoji picker → Task 2 (`ReactionBar`/`EmojiPicker`) + Task 1 (`toggleReaction`). ✅
- Collapse subtree with motion → Task 3 (`AnimatePresence` + `toggleCollapse`). ✅
- Hybrid depth cap (default 2, flatten deeper) → Task 3 (`indentChildren`). ✅
- CSS threading connector → Task 3 (connector span + bordered container). ✅
- Copied SSR-safe helpers (`useMounted`/`toDate`/`timeAgo`/`initials`) + `Mentions` + pinned/edited badges → Tasks 1–3. ✅
- Empty `comments` → render nothing → Task 3 (`if (tree.length === 0) return null`). ✅
- `registry.json` item → Task 5. ✅
- Demo wiring → Task 4. ✅

No gaps found.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every step shows complete code. ✅

**Type consistency:** `CommentNode`, `CommentAuthor`, `CommentReaction`, `NodeCtx`, `mapTree`, `toggleReaction`, `addReply`, `countDescendants`, `Mentions`, `ReactionBar`, `EmojiPicker`, `Composer`, `CommentNodeView`, `CommentThread` are referenced with consistent names/signatures across tasks. `Composer` takes a non-optional `author: CommentAuthor`, and `CommentThread` always supplies `me` (never undefined). ✅
