"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TreemapNode {
  id: string;
  label: string;
  value: number;
  category?: string;
}

export interface TreemapProps {
  nodes: TreemapNode[];
  title?: string;
  unit?: string;
  className?: string;
}

interface Rect {
  node: TreemapNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

const BOX_W = 100;
const BOX_H = 62;
const NEUTRAL = "#71717a";
const PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#ef4444",
  "#84cc16",
];

function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function pctLabel(value: number, total: number): string {
  const p = total > 0 ? (value / total) * 100 : 0;
  return p < 1 ? "<1" : String(Math.round(p));
}

function categoryColors(nodes: TreemapNode[]): Map<string, string> {
  const cats: string[] = [];
  for (const n of nodes) {
    const c = n.category;
    if (c && !cats.includes(c)) cats.push(c);
  }
  const m = new Map<string, string>();
  cats.forEach((c, i) => {
    m.set(c, PALETTE[i % PALETTE.length]);
  });
  return m;
}

function worstRatio(areas: number[], side: number): number {
  if (areas.length === 0) return Number.POSITIVE_INFINITY;
  const sum = areas.reduce((s, a) => s + a, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

function squarify(nodes: TreemapNode[], x0: number, y0: number, w: number, h: number): Rect[] {
  const items = nodes.filter((n) => n.value > 0).sort((a, b) => b.value - a.value);
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  const total = items.reduce((s, n) => s + n.value, 0);
  const boxArea = w * h;
  const scaled = items.map((n) => ({ area: (n.value / total) * boxArea, node: n }));

  const rects: Rect[] = [];
  let x = x0;
  let y = y0;
  let rw = w;
  let rh = h;
  let row: { area: number; node: TreemapNode }[] = [];

  const layoutRow = (r: { area: number; node: TreemapNode }[]) => {
    const sum = r.reduce((s, it) => s + it.area, 0);
    if (sum <= 0) return;
    if (rw >= rh) {
      const colW = sum / rh;
      let cy = y;
      for (const it of r) {
        const cellH = (it.area / sum) * rh;
        rects.push({ h: cellH, node: it.node, w: colW, x, y: cy });
        cy += cellH;
      }
      x += colW;
      rw -= colW;
    } else {
      const rowH = sum / rw;
      let cx = x;
      for (const it of r) {
        const cellW = (it.area / sum) * rw;
        rects.push({ h: rowH, node: it.node, w: cellW, x: cx, y });
        cx += cellW;
      }
      y += rowH;
      rh -= rowH;
    }
  };

  for (const item of scaled) {
    const side = Math.min(rw, rh);
    const current = row.map((it) => it.area);
    const next = [...current, item.area];
    if (row.length === 0 || worstRatio(next, side) <= worstRatio(current, side)) {
      row.push(item);
    } else {
      layoutRow(row);
      row = [item];
    }
  }
  if (row.length > 0) layoutRow(row);

  return rects;
}

export function Treemap({ nodes, title, unit, className }: TreemapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const valid = nodes.filter((n) => n.value > 0);

  if (valid.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No data
      </div>
    );
  }

  const total = valid.reduce((s, n) => s + n.value, 0);
  const colors = categoryColors(valid);
  const cats = [...colors.keys()];
  const rects = squarify(valid, 0, 0, BOX_W, BOX_H);
  const unitStr = unit ? ` ${unit}` : "";
  const hoveredNode = hovered ? (valid.find((n) => n.id === hovered) ?? null) : null;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 text-xs", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {title}
          <span className="ml-1.5 text-muted-foreground">
            Σ {formatValue(total)}
            {unitStr}
          </span>
        </span>
        {cats.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {cats.map((c) => (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground" key={c}>
                <span className="size-2 rounded-sm" style={{ background: colors.get(c) }} />
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded">
        {rects.map((r) => {
          const color = (r.node.category && colors.get(r.node.category)) || NEUTRAL;
          const isHover = hovered === r.node.id;
          const dim = hovered !== null && !isHover;
          const showLabel = r.w >= 12 && r.h >= 8;
          const showValue = showLabel && r.h >= 13;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover drives a visual detail highlight
            <div
              className={cn(
                "absolute overflow-hidden rounded-[3px] p-1 transition-opacity",
                dim && "opacity-30",
              )}
              key={r.node.id}
              onMouseEnter={() => setHovered(r.node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: color,
                height: `${(r.h / BOX_H) * 100}%`,
                left: `${r.x}%`,
                outline: isHover ? "1.5px solid var(--foreground)" : undefined,
                top: `${(r.y / BOX_H) * 100}%`,
                width: `${r.w}%`,
              }}
            >
              {showLabel ? (
                <div className="truncate font-medium text-[10px] text-white">{r.node.label}</div>
              ) : null}
              {showValue ? (
                <div className="truncate text-[9px] text-white/75">
                  {formatValue(r.node.value)}
                  {unitStr}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] text-muted-foreground">
        {hoveredNode ? (
          <span>
            <span className="font-medium text-foreground">{hoveredNode.label}</span> ·{" "}
            {formatValue(hoveredNode.value)}
            {unitStr} · {pctLabel(hoveredNode.value, total)}%
            {hoveredNode.category ? ` · ${hoveredNode.category}` : ""}
          </span>
        ) : (
          "Hover a cell for detail"
        )}
      </div>
    </div>
  );
}

export default Treemap;
