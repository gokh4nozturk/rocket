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

/** Render a body string, highlighting @mentions. */
function Mentions({ body }: { body: string }) {
  const parts = body.split(/(@[\w-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: key combines index + content; split array never reorders
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
          {node.author.avatarUrl && (
            <AvatarImage alt={node.author.name} src={node.author.avatarUrl} />
          )}
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
                        className="absolute top-0 -left-5 h-7 w-5 rounded-bl-[10px] border-border border-b border-l"
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
