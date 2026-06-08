"use client";

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
import { cn } from "@/lib/utils";

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
            {item.title && (
              <span className="font-medium text-foreground text-sm">{item.title}</span>
            )}
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
