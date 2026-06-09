"use client";

import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  KeyRound,
  Link2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Table2,
} from "lucide-react";
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

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;

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
  highlightAnchors,
  style,
  onToggle,
  onHover,
  onColHover,
  onGripDown,
  onGripMove,
  onGripUp,
}: {
  table: SchemaTable;
  collapsed: boolean;
  dim: boolean;
  dragging: boolean;
  highlightAnchors: Set<string>;
  style?: React.CSSProperties;
  onToggle: () => void;
  onHover: (name: string | null) => void;
  onColHover: (col: { table: string; column: string } | null) => void;
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
        "relative z-10 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-opacity",
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
        {visibleCols.map((c) => {
          const anchor = `${table.name}.${c.name}`;
          const hl = highlightAnchors.has(anchor);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: column hover highlights its FK relationship
            <div
              className={cn("flex items-center gap-1.5 px-2.5 py-1", hl && "bg-blue-500/10")}
              data-anchor={anchor}
              key={c.name}
              onMouseEnter={
                c.fk ? () => onColHover({ column: c.name, table: table.name }) : undefined
              }
              onMouseLeave={c.fk ? () => onColHover(null) : undefined}
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
          );
        })}
      </div>
      {hiddenCount > 0 ? (
        <div className="px-2.5 py-1 text-[10px] text-muted-foreground italic">
          +{hiddenCount} more
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SchemaDiagram({ tables, className }: SchemaDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [boardSize, setBoardSize] = useState({ h: 0, w: 0 });
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<{ table: string; column: string } | null>(null);
  const [search, setSearch] = useState("");
  const [positions, setPositions] = useState<Map<string, Point>>(() => new Map());
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [pan, setPanState] = useState<Point>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const zoomRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const dragRef = useRef<{
    name: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const edges = useMemo(() => buildEdges(tables), [tables]);
  const measured = tables.length > 0 && tables.every((t) => positions.has(t.name));

  const setView = useCallback((z: number, p: Point) => {
    zoomRef.current = z;
    panRef.current = p;
    setZoomState(z);
    setPanState(p);
  }, []);

  const refresh = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const z = zoomRef.current;
    const px = panRef.current.x;
    const py = panRef.current.y;
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
      const x1 = ((goRight ? sC.right : sC.left) - cRect.left - px) / z;
      const y1 = (sA.top + sA.height / 2 - cRect.top - py) / z;
      const x2 = ((goRight ? tC.left : tC.right) - cRect.left - px) / z;
      const y2 = (tA.top + tA.height / 2 - cRect.top - py) / z;
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
    let maxRight = 0;
    let maxBottom = 0;
    for (const el of container.querySelectorAll("[data-table]")) {
      const r = el.getBoundingClientRect();
      maxRight = Math.max(maxRight, (r.right - cRect.left - px) / z);
      maxBottom = Math.max(maxBottom, (r.bottom - cRect.top - py) / z);
    }
    if (maxRight > 0 && maxBottom > 0) {
      const w = maxRight + 16;
      const h = maxBottom + 16;
      setBoardSize((prev) =>
        Math.abs(prev.w - w) <= 0.5 && Math.abs(prev.h - h) <= 0.5 ? prev : { h, w },
      );
    }
  }, [edges]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: collapsed/positions re-measure lines + board size
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cRect = container.getBoundingClientRect();
      const z = zoomRef.current;
      const nz = clamp(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), MIN_ZOOM, MAX_ZOOM);
      if (nz === z) return;
      const cx = e.clientX - cRect.left;
      const cy = e.clientY - cRect.top;
      const bx = (cx - panRef.current.x) / z;
      const by = (cy - panRef.current.y) / z;
      setView(nz, { x: cx - bx * nz, y: cy - by * nz });
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [setView]);

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
    e.stopPropagation();
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const z = zoomRef.current;
    const nx = Math.max(0, d.origX + (e.clientX - d.startX) / z);
    const ny = Math.max(0, d.origY + (e.clientY - d.startY) / z);
    setPositions((prev) => new Map(prev).set(d.name, { x: nx, y: ny }));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingName(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const startPan = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-table]")) return;
    panStartRef.current = {
      origX: panRef.current.x,
      origY: panRef.current.y,
      startX: e.clientX,
      startY: e.clientY,
    };
    setPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const movePan = (e: React.PointerEvent) => {
    const p = panStartRef.current;
    if (!p) return;
    setView(zoomRef.current, {
      x: p.origX + (e.clientX - p.startX),
      y: p.origY + (e.clientY - p.startY),
    });
  };

  const endPan = (e: React.PointerEvent) => {
    if (!panStartRef.current) return;
    panStartRef.current = null;
    setPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const zoomBy = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const z = zoomRef.current;
    const nz = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
    const bx = (cx - panRef.current.x) / z;
    const by = (cy - panRef.current.y) / z;
    setView(nz, { x: cx - bx * nz, y: cy - by * nz });
  };

  const fit = () => {
    const container = containerRef.current;
    if (!container || boardSize.w <= 0 || boardSize.h <= 0) return;
    const vw = container.clientWidth;
    const vh = container.clientHeight;
    const nz = clamp(Math.min(vw / boardSize.w, vh / boardSize.h) * 0.95, MIN_ZOOM, MAX_ZOOM);
    setView(nz, {
      x: Math.max(0, (vw - boardSize.w * nz) / 2),
      y: Math.max(0, (vh - boardSize.h * nz) / 2),
    });
  };

  const reset = () => {
    setPositions(new Map());
    setView(1, { x: 0, y: 0 });
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

  const isolated = tables.filter(
    (t) => !edges.some((e) => e.sourceTable === t.name || e.targetTable === t.name),
  ).length;

  let focusTables: Set<string> | null = null;
  let focusEdges: Set<string> | null = null;
  const highlightAnchors = new Set<string>();
  if (hoveredCol) {
    const e = edges.find(
      (ed) => ed.sourceTable === hoveredCol.table && ed.sourceColumn === hoveredCol.column,
    );
    if (e) {
      focusTables = new Set([e.sourceTable, e.targetTable]);
      focusEdges = new Set([e.id]);
      highlightAnchors.add(`${e.sourceTable}.${e.sourceColumn}`);
      highlightAnchors.add(`${e.targetTable}.${e.targetColumn}`);
    }
  } else if (hovered) {
    focusTables = neighborsOf(hovered, edges);
    focusEdges = new Set(
      edges.filter((e) => e.sourceTable === hovered || e.targetTable === hovered).map((e) => e.id),
    );
  } else if (search.trim()) {
    const q = search.trim().toLowerCase();
    const matched = new Set(
      tables.filter((t) => t.name.toLowerCase().includes(q)).map((t) => t.name),
    );
    focusTables = matched;
    focusEdges = new Set(
      edges
        .filter((e) => matched.has(e.sourceTable) || matched.has(e.targetTable))
        .map((e) => e.id),
    );
  }

  const lineDim = (ln: Line) => (focusEdges ? !focusEdges.has(ln.id) : false);

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="text-[11px] text-muted-foreground">
          {tables.length} tables · {edges.length} relations
          {isolated > 0 ? ` · ${isolated} isolated` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-7 w-32 rounded-md border border-border bg-background pr-2 pl-7 text-xs outline-none focus:border-foreground/30"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find table…"
              value={search}
            />
          </div>
          <ToolbarButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus className="size-3.5" />
          </ToolbarButton>
          <span className="w-9 text-center text-[11px] text-muted-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarButton label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Fit to view" onClick={fit}>
            <Maximize2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Reset layout" onClick={reset}>
            <RotateCcw className="size-3.5" />
          </ToolbarButton>
        </div>
      </div>
      <div
        className={cn(
          "relative h-[440px] touch-none overflow-hidden",
          panning ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerCancel={endPan}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        ref={containerRef}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <div
            className={cn("relative", !measured && "flex flex-wrap gap-x-16 gap-y-8 p-4")}
            style={measured ? { height: boardSize.h, width: boardSize.w } : undefined}
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
            {tables.map((t) => {
              const pos = positions.get(t.name);
              return (
                <TableCard
                  collapsed={collapsed.has(t.name)}
                  dim={focusTables ? !focusTables.has(t.name) : false}
                  dragging={draggingName === t.name}
                  highlightAnchors={highlightAnchors}
                  key={t.name}
                  onColHover={setHoveredCol}
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
    </div>
  );
}

export default SchemaDiagram;
