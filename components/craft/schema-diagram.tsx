"use client";

import { ChevronDown, ChevronRight, KeyRound, Link2, Table2 } from "lucide-react";
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
  onToggle,
  onHover,
}: {
  table: SchemaTable;
  collapsed: boolean;
  dim: boolean;
  onToggle: () => void;
  onHover: (name: string | null) => void;
}) {
  const visibleCols = collapsed ? table.columns.filter((c) => c.pk || c.fk) : table.columns;
  const hiddenCount = table.columns.length - visibleCols.length;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only drives a visual relationship highlight
    <div
      className={cn(
        "relative w-56 overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-opacity",
        dim && "opacity-20",
      )}
      data-table={table.name}
      onMouseEnter={() => onHover(table.name)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        className="flex w-full items-center gap-1.5 border-border border-b bg-muted/40 px-2.5 py-1.5 text-left font-semibold transition-colors hover:bg-muted"
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

  const edges = useMemo(() => buildEdges(tables), [tables]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: collapsed re-measures lines on collapse/expand
  useEffect(() => {
    recompute();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(container);
    for (const el of container.querySelectorAll("[data-table]")) ro.observe(el);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, collapsed]);

  const toggle = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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
      <div className="relative" ref={containerRef}>
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
        <div className="relative z-10 flex flex-wrap gap-x-16 gap-y-8">
          {tables.map((t) => (
            <TableCard
              collapsed={collapsed.has(t.name)}
              dim={active ? !active.has(t.name) : false}
              key={t.name}
              onHover={setHovered}
              onToggle={() => toggle(t.name)}
              table={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SchemaDiagram;
