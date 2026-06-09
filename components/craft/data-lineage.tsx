"use client";

import { ArrowDown, ArrowUp, BarChart3, Cog, Database, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type NodeType = "source" | "transform" | "output";
export type NodeStatus = "fresh" | "stale" | "failed";

export interface LineageNode {
  id: string;
  label: string;
  type?: NodeType;
  status?: NodeStatus;
  sublabel?: string;
}

export interface LineageEdge {
  from: string;
  to: string;
}

export interface DataLineageProps {
  nodes: LineageNode[];
  edges: LineageEdge[];
  className?: string;
}

type Direction = "up" | "down" | "both";

const NODE_W = 168;
const NODE_H = 52;
const COL_GAP = 64;
const ROW_GAP = 20;
const HEADER_H = 24;

const TYPE_META: Record<NodeType, { color: string; label: string; Icon: LucideIcon }> = {
  output: { color: "#10b981", Icon: BarChart3, label: "Outputs" },
  source: { color: "#3b82f6", Icon: Database, label: "Sources" },
  transform: { color: "#8b5cf6", Icon: Cog, label: "Transforms" },
};

const STATUS_META: Record<NodeStatus, { color: string; label: string }> = {
  failed: { color: "#ef4444", label: "Failed" },
  fresh: { color: "#10b981", label: "Fresh" },
  stale: { color: "#f59e0b", label: "Stale" },
};

function computeLevels(nodes: LineageNode[], edges: LineageEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const valid = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const level = new Map<string, number>();
  for (const n of nodes) level.set(n.id, 0);
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of valid) {
      const next = (level.get(e.from) ?? 0) + 1;
      if (next > (level.get(e.to) ?? 0)) {
        level.set(e.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

interface LayoutResult {
  positions: Map<string, { x: number; y: number; level: number }>;
  columns: string[][];
  boardW: number;
  boardH: number;
}

function layout(nodes: LineageNode[], edges: LineageEdge[]): LayoutResult {
  const level = computeLevels(nodes, edges);
  const maxLevel = Math.max(0, ...nodes.map((n) => level.get(n.id) ?? 0));
  const columns: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const n of nodes) columns[level.get(n.id) ?? 0].push(n.id);
  const maxCount = Math.max(1, ...columns.map((c) => c.length));
  const boardH = maxCount * (NODE_H + ROW_GAP) - ROW_GAP;
  const boardW = (maxLevel + 1) * (NODE_W + COL_GAP) - COL_GAP;
  const positions = new Map<string, { x: number; y: number; level: number }>();
  columns.forEach((col, lvl) => {
    const colH = col.length * (NODE_H + ROW_GAP) - ROW_GAP;
    const startY = (boardH - colH) / 2;
    col.forEach((id, i) => {
      positions.set(id, {
        level: lvl,
        x: lvl * (NODE_W + COL_GAP),
        y: startY + i * (NODE_H + ROW_GAP),
      });
    });
  });
  return { boardH, boardW, columns, positions };
}

function buildAdj(edges: LineageEdge[]): {
  out: Map<string, string[]>;
  inc: Map<string, string[]>;
} {
  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from)?.push(e.to);
    if (!inc.has(e.to)) inc.set(e.to, []);
    inc.get(e.to)?.push(e.from);
  }
  return { inc, out };
}

function bfs(start: string, adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const nx of adj.get(cur) ?? []) {
      if (!seen.has(nx)) {
        seen.add(nx);
        queue.push(nx);
      }
    }
  }
  return seen;
}

function traceLineage(
  id: string,
  dir: Direction,
  adj: { out: Map<string, string[]>; inc: Map<string, string[]> },
): { traced: Set<string>; up: Set<string>; down: Set<string> } {
  const up = bfs(id, adj.inc);
  const down = bfs(id, adj.out);
  const traced = new Set<string>([id]);
  if (dir === "up" || dir === "both") for (const n of up) traced.add(n);
  if (dir === "down" || dir === "both") for (const n of down) traced.add(n);
  return { down, traced, up };
}

function columnHeader(ids: string[], nodeMap: Map<string, LineageNode>, level: number): string {
  const types = new Set(ids.map((id) => nodeMap.get(id)?.type).filter(Boolean));
  if (types.size === 1) {
    const [t] = [...types];
    if (t) return TYPE_META[t].label;
  }
  return `Layer ${level + 1}`;
}

function NodeCard({
  node,
  x,
  y,
  dim,
  onHover,
}: {
  node: LineageNode;
  x: number;
  y: number;
  dim: boolean;
  onHover: (id: string | null) => void;
}) {
  const tm = node.type ? TYPE_META[node.type] : null;
  const sm = node.status ? STATUS_META[node.status] : null;
  const Icon = tm?.Icon ?? Database;
  const color = tm?.color ?? "#888888";
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover drives a visual lineage trace
    <div
      className={cn(
        "absolute flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 shadow-sm transition-opacity",
        dim && "opacity-20",
      )}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ height: NODE_H, left: x, top: y, width: NODE_W }}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${color}1f`, color }}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium font-mono">{node.label}</span>
          {sm ? (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: sm.color }}
              title={sm.label}
            />
          ) : null}
        </div>
        {node.sublabel ? (
          <div className="truncate text-[10px] text-muted-foreground">{node.sublabel}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DataLineage({ nodes, edges, className }: DataLineageProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("both");

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const { positions, columns, boardW, boardH } = useMemo(
    () => layout(nodes, edges),
    [nodes, edges],
  );
  const adj = useMemo(() => buildAdj(edges), [edges]);

  if (nodes.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No nodes
      </div>
    );
  }

  const trace = hovered ? traceLineage(hovered, direction, adj) : null;
  const tracedNodes = trace?.traced ?? null;
  const validEdges = edges.filter((e) => positions.has(e.from) && positions.has(e.to));
  const edgeActive = (e: LineageEdge) =>
    tracedNodes ? tracedNodes.has(e.from) && tracedNodes.has(e.to) : false;

  const directions: { key: Direction; label: string }[] = [
    { key: "up", label: "Upstream" },
    { key: "both", label: "Both" },
    { key: "down", label: "Downstream" },
  ];

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {hovered && trace ? (
            <>
              <ArrowUp className="size-3" />
              {trace.up.size} upstream
              <span className="mx-1">·</span>
              <ArrowDown className="size-3" />
              {trace.down.size} downstream
              <span className="mx-1">—</span>
              <span className="text-foreground">{nodeMap.get(hovered)?.label}</span>
            </>
          ) : (
            `${nodes.length} nodes · ${validEdges.length} edges`
          )}
        </span>
        <div className="ml-auto flex items-center overflow-hidden rounded-md border border-border">
          {directions.map((d) => (
            <button
              className={cn(
                "px-2 py-0.5 text-[11px] transition-colors",
                direction === d.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={d.key}
              onClick={() => setDirection(d.key)}
              type="button"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="relative" style={{ height: boardH + HEADER_H, width: boardW }}>
          {columns.map((col, lvl) => (
            <div
              className="absolute truncate text-[10px] text-muted-foreground uppercase tracking-wide"
              key={`col-${lvl}`}
              style={{ left: lvl * (NODE_W + COL_GAP), top: 0, width: NODE_W }}
            >
              {columnHeader(col, nodeMap, lvl)}
            </div>
          ))}

          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground/60"
          >
            <defs>
              <marker
                id="dl-arrow"
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M1 1 L7 4 L1 7" fill="none" stroke="context-stroke" strokeWidth="1" />
              </marker>
            </defs>
            {validEdges.map((e) => {
              const s = positions.get(e.from);
              const t = positions.get(e.to);
              if (!s || !t) return null;
              const sx = s.x + NODE_W;
              const sy = s.y + NODE_H / 2 + HEADER_H;
              const tx = t.x;
              const ty = t.y + NODE_H / 2 + HEADER_H;
              const dx = Math.max(24, (tx - sx) * 0.5);
              const active = edgeActive(e);
              return (
                <path
                  className={cn(
                    "transition-opacity",
                    trace && !active && "opacity-15",
                    active && "text-foreground",
                  )}
                  d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`}
                  fill="none"
                  key={`${e.from}->${e.to}`}
                  markerEnd="url(#dl-arrow)"
                  stroke="currentColor"
                  strokeWidth={active ? 1.5 : 1}
                />
              );
            })}
          </svg>

          {nodes.map((n) => {
            const pos = positions.get(n.id);
            if (!pos) return null;
            return (
              <NodeCard
                dim={tracedNodes ? !tracedNodes.has(n.id) : false}
                key={n.id}
                node={n}
                onHover={setHovered}
                x={pos.x}
                y={pos.y + HEADER_H}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DataLineage;
