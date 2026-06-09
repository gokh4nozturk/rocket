"use client";

import { ChevronDown, ChevronRight, GripVertical, KeyRound, Link2, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SchemaColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: { table: string; column: string };
  nullable?: boolean;
  unique?: boolean;
  index?: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface SchemaDiagramProps {
  tables: SchemaTable[];
  className?: string;
}

interface Edge {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

interface Line {
  id: string;
  d: string;
  sourceTable: string;
  targetTable: string;
}

interface Point {
  x: number;
  y: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function buildEdges(tables: SchemaTable[]): Edge[] {
  const tableMap = new Map(tables.map((t) => [t.name, t]));
  const edges: Edge[] = [];
  for (const t of tables) {
    for (const c of t.columns) {
      const fk = c.fk;
      if (!fk) continue;
      const target = tableMap.get(fk.table);
      if (!target?.columns.some((tc) => tc.name === fk.column)) continue;
      edges.push({
        id: `${t.name}.${c.name}->${fk.table}.${fk.column}`,
        sourceColumn: c.name,
        sourceTable: t.name,
        targetColumn: fk.column,
        targetTable: fk.table,
      });
    }
  }
  return edges;
}

function neighborsOf(table: string, edges: Edge[]): Set<string> {
  const s = new Set<string>([table]);
  for (const e of edges) {
    if (e.sourceTable === table) s.add(e.targetTable);
    if (e.targetTable === table) s.add(e.sourceTable);
  }
  return s;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded bg-muted px-1 py-px font-medium text-[9px] text-muted-foreground">
      {children}
    </span>
  );
}

function TableCard({
  table,
  collapsed,
  dim,
  dragging,
  style,
  onToggle,
  onHover,
  onGripDown,
  onGripMove,
  onGripUp,
}: {
  table: SchemaTable;
  collapsed: boolean;
  dim: boolean;
  dragging: boolean;
  style?: React.CSSProperties;
  onToggle: () => void;
  onHover: (name: string | null) => void;
  onGripDown: (e: React.PointerEvent) => void;
  onGripMove: (e: React.PointerEvent) => void;
  onGripUp: (e: React.PointerEvent) => void;
}) {
  const visibleCols = collapsed ? table.columns.filter((c) => c.pk || c.fk) : table.columns;
  const hiddenCount = table.columns.length - visibleCols.length;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only drives a visual relationship highlight
    <div
      className={cn(
        "w-56 overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-opacity",
        dim && "opacity-20",
        dragging && "z-20 shadow-lg ring-1 ring-foreground/20",
      )}
      data-table={table.name}
      onMouseEnter={() => onHover(table.name)}
      onMouseLeave={() => onHover(null)}
      style={style}
    >
      <div className="flex items-center border-border border-b bg-muted/40 pr-2">
        <button
          aria-label={`Drag ${table.name}`}
          className="flex cursor-grab touch-none items-center py-1.5 pr-0.5 pl-1.5 text-muted-foreground active:cursor-grabbing"
          onPointerCancel={onGripUp}
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          type="button"
        >
          <GripVertical className="size-3.5 shrink-0" />
        </button>
        <button
          className="flex flex-1 items-center gap-1.5 py-1.5 pr-1 text-left font-semibold transition-colors hover:text-foreground"
          onClick={onToggle}
          type="button"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0" />
          )}
          <Table2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono">{table.name}</span>
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {visibleCols.map((c) => (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1"
            data-anchor={`${table.name}.${c.name}`}
            key={c.name}
          >
            <span className="flex w-3.5 shrink-0 justify-center">
              {c.pk ? (
                <KeyRound className="size-3 text-amber-500" />
              ) : c.fk ? (
                <Link2 className="size-3 text-blue-500" />
              ) : null}
            </span>
            <span className={cn("truncate font-mono", c.pk && "font-semibold")}>{c.name}</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="font-mono text-[10px] text-muted-foreground">{c.type}</span>
              {c.fk ? (
                <Badge>
                  → {c.fk.table}.{c.fk.column}
                </Badge>
              ) : null}
              {c.unique ? <Badge>UNIQUE</Badge> : null}
              {c.index && !c.pk ? <Badge>IDX</Badge> : null}
              {c.nullable === false && !c.pk ? <Badge>NOT NULL</Badge> : null}
            </span>
          </div>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="px-2.5 py-1 text-[10px] text-muted-foreground italic">
          +{hiddenCount} more
        </div>
      ) : null}
    </div>
  );
}

export function SchemaDiagram({ tables, className }: SchemaDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, Point>>(() => new Map());
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const dragRef = useRef<{
    name: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const edges = useMemo(() => buildEdges(tables), [tables]);
  const measured = tables.length > 0 && tables.every((t) => positions.has(t.name));

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const rectOf = (selector: string) => {
      const el = container.querySelector(selector);
      return el ? el.getBoundingClientRect() : null;
    };
    const next: Line[] = [];
    for (const e of edges) {
      const sA = rectOf(`[data-anchor="${e.sourceTable}.${e.sourceColumn}"]`);
      const tA = rectOf(`[data-anchor="${e.targetTable}.${e.targetColumn}"]`);
      const sC = rectOf(`[data-table="${e.sourceTable}"]`);
      const tC = rectOf(`[data-table="${e.targetTable}"]`);
      if (!sA || !tA || !sC || !tC) continue;
      const goRight = tC.left + tC.width / 2 >= sC.left + sC.width / 2;
      const x1 = (goRight ? sC.right : sC.left) - cRect.left;
      const y1 = sA.top + sA.height / 2 - cRect.top;
      const x2 = (goRight ? tC.left : tC.right) - cRect.left;
      const y2 = tA.top + tA.height / 2 - cRect.top;
      const dx = clamp(Math.abs(x2 - x1) * 0.5, 24, 120);
      const c1 = goRight ? x1 + dx : x1 - dx;
      const c2 = goRight ? x2 - dx : x2 + dx;
      next.push({
        d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1.toFixed(1)} ${y1.toFixed(1)}, ${c2.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        id: e.id,
        sourceTable: e.sourceTable,
        targetTable: e.targetTable,
      });
    }
    setLines(next);
  }, [edges]);

  const refresh = useCallback(() => {
    recompute();
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    let maxBottom = 0;
    for (const el of container.querySelectorAll("[data-table]")) {
      maxBottom = Math.max(maxBottom, el.getBoundingClientRect().bottom - cRect.top);
    }
    if (maxBottom > 0) {
      const h = maxBottom + 8;
      setBoardHeight((prev) => (prev !== null && Math.abs(prev - h) <= 0.5 ? prev : h));
    }
  }, [recompute]);

  useEffect(() => {
    if (measured) return;
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next = new Map<string, Point>();
    for (const t of tables) {
      const el = container.querySelector(`[data-table="${t.name}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next.set(t.name, { x: r.left - cRect.left, y: r.top - cRect.top });
    }
    if (next.size === tables.length) setPositions(next);
  }, [measured, tables]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: collapsed/positions re-measure lines + board height
  useEffect(() => {
    refresh();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => refresh());
    ro.observe(container);
    for (const el of container.querySelectorAll("[data-table]")) ro.observe(el);
    window.addEventListener("resize", refresh);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [refresh, collapsed, positions]);

  const toggle = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const startDrag = (name: string, e: React.PointerEvent) => {
    const pos = positions.get(name) ?? { x: 0, y: 0 };
    dragRef.current = { name, origX: pos.x, origY: pos.y, startX: e.clientX, startY: e.clientY };
    setDraggingName(name);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = Math.max(0, d.origX + (e.clientX - d.startX));
    const ny = Math.max(0, d.origY + (e.clientY - d.startY));
    setPositions((prev) => new Map(prev).set(d.name, { x: nx, y: ny }));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingName(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (tables.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No tables
      </div>
    );
  }

  const active = hovered ? neighborsOf(hovered, edges) : null;
  const lineDim = (ln: Line) =>
    hovered ? ln.sourceTable !== hovered && ln.targetTable !== hovered : false;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 text-xs", className)}>
      <div
        className="relative"
        ref={containerRef}
        style={measured && boardHeight ? { height: boardHeight } : undefined}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-muted-foreground/70"
        >
          <defs>
            <marker
              id="sd-many"
              markerHeight="12"
              markerUnits="userSpaceOnUse"
              markerWidth="12"
              orient="auto"
              refX="10"
              refY="6"
            >
              <path
                d="M10 6 L2 2 M10 6 L2 6 M10 6 L2 10"
                fill="none"
                stroke="context-stroke"
                strokeWidth="1"
              />
            </marker>
            <marker
              id="sd-one"
              markerHeight="12"
              markerUnits="userSpaceOnUse"
              markerWidth="12"
              orient="auto"
              refX="3"
              refY="6"
            >
              <path d="M5 2 L5 10" fill="none" stroke="context-stroke" strokeWidth="1.5" />
            </marker>
          </defs>
          {lines.map((ln) => (
            <path
              className={cn("transition-opacity", lineDim(ln) && "opacity-15")}
              d={ln.d}
              fill="none"
              key={ln.id}
              markerEnd="url(#sd-one)"
              markerStart="url(#sd-many)"
              stroke="currentColor"
              strokeWidth={1.25}
            />
          ))}
        </svg>
        <div className={cn("relative z-10", !measured && "flex flex-wrap gap-x-16 gap-y-8")}>
          {tables.map((t) => {
            const pos = positions.get(t.name);
            return (
              <TableCard
                collapsed={collapsed.has(t.name)}
                dim={active ? !active.has(t.name) : false}
                dragging={draggingName === t.name}
                key={t.name}
                onGripDown={(e) => startDrag(t.name, e)}
                onGripMove={moveDrag}
                onGripUp={endDrag}
                onHover={setHovered}
                onToggle={() => toggle(t.name)}
                style={
                  measured && pos ? { left: pos.x, position: "absolute", top: pos.y } : undefined
                }
                table={t}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SchemaDiagram;
