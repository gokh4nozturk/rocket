"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface TraceSpan {
  id: string;
  parentId?: string | null;
  name: string;
  service?: string;
  start: number;
  duration: number;
  status?: "ok" | "error";
}

export interface TraceWaterfallProps {
  spans: TraceSpan[];
  defaultCollapsedDepth?: number;
  showRuler?: boolean;
  className?: string;
}

interface SpanNode {
  span: TraceSpan;
  children: SpanNode[];
  depth: number;
}

interface Row {
  node: SpanNode;
  hasChildren: boolean;
  collapsed: boolean;
}

const PALETTE = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"];
const ERROR_COLOR = "#ef4444";

function palette(service: string | undefined): string {
  if (!service) return "#6b7280";
  let h = 0;
  for (let i = 0; i < service.length; i++) h = (h * 31 + service.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 100) return `${Math.round(ms)}ms`;
  if (ms >= 10) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(2)}ms`;
}

function buildTree(spans: TraceSpan[]): SpanNode[] {
  const byId = new Map<string, SpanNode>();
  for (const s of spans) byId.set(s.id, { children: [], depth: 0, span: s });
  const roots: SpanNode[] = [];
  for (const s of spans) {
    const node = byId.get(s.id);
    if (!node) continue;
    const parent = s.parentId != null ? byId.get(s.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: SpanNode[], depth: number) => {
    nodes.sort((a, b) => a.span.start - b.span.start);
    for (const n of nodes) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

function traceTotal(spans: TraceSpan[]): number {
  let max = 0;
  for (const s of spans) max = Math.max(max, s.start + s.duration);
  return Math.max(max, 1);
}

function defaultCollapsed(roots: SpanNode[], depth: number | undefined): Set<string> {
  const set = new Set<string>();
  if (depth === undefined) return set;
  const walk = (nodes: SpanNode[]) => {
    for (const n of nodes) {
      if (n.depth >= depth && n.children.length > 0) set.add(n.span.id);
      walk(n.children);
    }
  };
  walk(roots);
  return set;
}

function flatten(roots: SpanNode[], collapsed: Set<string>): Row[] {
  const rows: Row[] = [];
  const walk = (nodes: SpanNode[]) => {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0;
      const isCollapsed = collapsed.has(node.span.id);
      rows.push({ collapsed: isCollapsed, hasChildren, node });
      if (hasChildren && !isCollapsed) walk(node.children);
    }
  };
  walk(roots);
  return rows;
}

const TICKS = [0, 0.25, 0.5, 0.75, 1];

export function TraceWaterfall({
  spans,
  defaultCollapsedDepth,
  showRuler = true,
  className,
}: TraceWaterfallProps) {
  const roots = useMemo(() => buildTree(spans), [spans]);
  const total = useMemo(() => traceTotal(spans), [spans]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    defaultCollapsed(roots, defaultCollapsedDepth),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = useMemo(() => flatten(roots, collapsed), [roots, collapsed]);
  const hoveredSpan = hovered ? spans.find((s) => s.id === hovered) : null;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (spans.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No spans
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      {showRuler ? (
        <div className="flex border-border border-b font-sans">
          <div className="w-[38%] shrink-0 px-2 py-1.5 font-medium text-muted-foreground">Span</div>
          <div className="relative h-7 flex-1">
            {TICKS.map((tk) => (
              <span
                className="absolute top-1.5 text-[10px] text-muted-foreground tabular-nums"
                key={tk}
                style={{
                  left: `${tk * 100}%`,
                  transform:
                    tk === 1 ? "translateX(-100%)" : tk === 0 ? "none" : "translateX(-50%)",
                }}
              >
                {formatMs(tk * total)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative max-h-80 overflow-y-auto overflow-x-hidden">
        {showRuler ? (
          <div className="pointer-events-none absolute inset-0 left-[38%]">
            {TICKS.slice(1).map((tk) => (
              <span
                className="absolute top-0 bottom-0 w-px bg-border/60"
                key={tk}
                style={{ left: `${tk * 100}%` }}
              />
            ))}
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const s = row.node.span;
            const color = s.status === "error" ? ERROR_COLOR : palette(s.service);
            const left = (s.start / total) * 100;
            const width = Math.max((s.duration / total) * 100, 0.5);
            return (
              <motion.div
                animate={{ opacity: 1 }}
                className={cn(
                  "flex items-center hover:bg-muted/40",
                  hovered === s.id && "bg-muted/40",
                )}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={s.id}
                layout
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
                transition={{ duration: 0.12 }}
              >
                <div
                  className="flex w-[38%] shrink-0 items-center gap-1 py-1 pr-2"
                  style={{ paddingLeft: 8 + row.node.depth * 14 }}
                >
                  {row.hasChildren ? (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggle(s.id)}
                      type="button"
                    >
                      <ChevronRight
                        className={cn("size-3 transition-transform", !row.collapsed && "rotate-90")}
                      />
                    </button>
                  ) : (
                    <span className="inline-block w-3 shrink-0" />
                  )}
                  {s.status === "error" ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
                  ) : null}
                  <span className="truncate font-medium">{s.name}</span>
                  {s.service ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{s.service}</span>
                  ) : null}
                </div>

                <div className="relative h-5 flex-1">
                  <div
                    className="absolute top-1 h-3 rounded-sm"
                    style={{ background: color, left: `${left}%`, width: `${width}%` }}
                  />
                  <span
                    className="absolute top-0.5 whitespace-nowrap pl-1 text-[10px] text-muted-foreground tabular-nums"
                    style={{ left: `${Math.min(left + width, 100)}%` }}
                  >
                    {formatMs(s.duration)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 border-border border-t px-2 py-1.5 font-sans text-[11px] text-muted-foreground">
        {hoveredSpan ? (
          <>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                background:
                  hoveredSpan.status === "error" ? ERROR_COLOR : palette(hoveredSpan.service),
              }}
            />
            <span className="font-medium text-foreground">{hoveredSpan.name}</span>
            {hoveredSpan.service ? <span>· {hoveredSpan.service}</span> : null}
            <span>· {formatMs(hoveredSpan.duration)}</span>
            <span>· {((hoveredSpan.duration / total) * 100).toFixed(1)}% of trace</span>
            <span>· start +{formatMs(hoveredSpan.start)}</span>
            {hoveredSpan.status === "error" ? (
              <span className="text-red-600 dark:text-red-400">· error</span>
            ) : null}
          </>
        ) : (
          <span>Hover a span for detail · total {formatMs(total)}</span>
        )}
      </div>
    </div>
  );
}

export default TraceWaterfall;
