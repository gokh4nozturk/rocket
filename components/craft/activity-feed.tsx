"use client";

import {
  AtSign,
  Bell,
  CircleDot,
  GitCommit,
  GitMerge,
  type LucideIcon,
  MessageSquare,
  Rocket,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ActivityType = "comment" | "commit" | "merge" | "issue" | "star" | "deploy" | "mention";

export interface ActivityActor {
  name: string;
  avatarUrl?: string;
  fallback?: string;
}

export interface ActivityAttachment {
  kind: "quote" | "image" | "link";
  text?: string;
  imageUrl?: string;
  href?: string;
  meta?: string;
  alt?: string;
}

export interface ActivityItem {
  id?: string;
  actor: ActivityActor;
  type?: ActivityType;
  icon?: LucideIcon;
  action: string;
  target?: string;
  time: string | number | Date;
  attachment?: ActivityAttachment;
  live?: boolean;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  groupByDate?: boolean;
  stickyHeaders?: boolean;
}

const TYPE_BADGE: Record<ActivityType, { icon: LucideIcon; className: string }> = {
  comment: { className: "text-sky-500 dark:text-sky-400", icon: MessageSquare },
  commit: { className: "text-violet-500 dark:text-violet-400", icon: GitCommit },
  deploy: { className: "text-emerald-600 dark:text-emerald-400", icon: Rocket },
  issue: { className: "text-amber-500 dark:text-amber-400", icon: CircleDot },
  mention: { className: "text-blue-500 dark:text-blue-400", icon: AtSign },
  merge: { className: "text-green-600 dark:text-green-400", icon: GitMerge },
  star: { className: "text-amber-500 dark:text-amber-400", icon: Star },
};

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

/** Group bucket label: Today/Yesterday after mount, else absolute date. */
function dayBucket(value: string | number | Date, mounted: boolean): string {
  const d = toDate(value);
  if (!d) return "";
  if (mounted) {
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
  }
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

function LiveDot() {
  return (
    <span aria-hidden className="relative inline-flex size-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
      <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
    </span>
  );
}

function TypeBadge({ type, icon }: { type?: ActivityType; icon?: LucideIcon }) {
  const base = type ? TYPE_BADGE[type] : undefined;
  const Icon = icon ?? base?.icon ?? Bell;
  const color = base?.className ?? "text-muted-foreground";
  return (
    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border bg-background">
      <Icon className={cn("size-2.5", color)} strokeWidth={2.5} />
    </span>
  );
}

function Attachment({ attachment }: { attachment: ActivityAttachment }) {
  if (attachment.kind === "quote") {
    return (
      <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground text-sm italic">
        {attachment.text}
      </blockquote>
    );
  }
  if (attachment.kind === "image") {
    return (
      // biome-ignore lint/performance/noImgElement: registry component stays framework-agnostic (no next/image)
      <img
        alt={attachment.alt ?? ""}
        className="mt-2 max-h-48 w-full rounded-lg border object-cover"
        src={attachment.imageUrl}
      />
    );
  }
  const card = (
    <div className="mt-2 rounded-lg border bg-muted/40 p-3">
      <div className="font-medium text-foreground text-sm">{attachment.text}</div>
      {attachment.meta && <div className="text-muted-foreground text-xs">{attachment.meta}</div>}
    </div>
  );
  return attachment.href ? (
    <a className="block" href={attachment.href} rel="noreferrer" target="_blank">
      {card}
    </a>
  ) : (
    card
  );
}

function Row({ item, live, mounted }: { item: ActivityItem; live: boolean; mounted: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="relative shrink-0">
        <Avatar className="size-9">
          {item.actor.avatarUrl && <AvatarImage alt={item.actor.name} src={item.actor.avatarUrl} />}
          <AvatarFallback>{item.actor.fallback ?? initials(item.actor.name)}</AvatarFallback>
        </Avatar>
        <TypeBadge icon={item.icon} type={item.type} />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <span className="text-sm leading-snug">
            <span className="font-medium text-foreground">{item.actor.name}</span>
            <span className="text-muted-foreground"> {item.action} </span>
            {item.target && <span className="font-medium text-foreground">{item.target}</span>}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            {live && <LiveDot />}
            {timeAgo(item.time, mounted)}
          </span>
        </div>
        {item.attachment && <Attachment attachment={item.attachment} />}
      </div>
    </div>
  );
}

/**
 * ActivityFeed — an avatar-led activity feed. Each row shows an actor avatar with
 * an event-type badge, a rich action line, a relative timestamp, and an optional
 * attachment (quote / image / link). Items group by date and the newest (or any
 * `live`) item gets a pulsing indicator; new items animate in when prepended.
 */
export function ActivityFeed({
  items,
  className,
  groupByDate = true,
  stickyHeaders = false,
}: ActivityFeedProps) {
  const mounted = useMounted();
  const anyLive = items.some((it) => it.live);
  const isLive = (item: ActivityItem, index: number) => (anyLive ? !!item.live : index === 0);
  const keyOf = (item: ActivityItem, index: number) => item.id ?? String(index);

  if (!groupByDate) {
    return (
      <div className={cn("flex flex-col gap-5", className)}>
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              animate={{ height: "auto", opacity: 1, y: 0 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0, y: -8 }}
              key={keyOf(item, i)}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Row item={item} live={isLive(item, i)} mounted={mounted} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  const groups: { label: string; items: { item: ActivityItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const label = dayBucket(item.time, mounted) || "—";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ index, item });
    else groups.push({ items: [{ index, item }], label });
  });

  return (
    <div className={cn("flex flex-col", className)}>
      {groups.map((group) => (
        <div key={`${group.label}-${group.items[0].index}`}>
          <div
            className={cn(
              "mt-6 mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide first:mt-0",
              stickyHeaders && "sticky top-0 z-10 bg-background py-1",
            )}
          >
            {group.label}
          </div>
          <div className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {group.items.map(({ item, index }) => (
                <motion.div
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  key={keyOf(item, index)}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Row item={item} live={isLive(item, index)} mounted={mounted} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
