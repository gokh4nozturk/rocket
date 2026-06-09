"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Columns3,
  ListFilter,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ColumnType = "text" | "number" | "boolean" | "date" | "badge";

export interface Column {
  key: string;
  label: string;
  type?: ColumnType;
  sortable?: boolean;
  facet?: boolean;
  align?: "left" | "right";
}

export interface DataGridProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  idKey?: string;
  pageSize?: number;
  selectable?: boolean;
  searchable?: boolean;
  className?: string;
}

const BADGE_PALETTE = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
const numberFmt = new Intl.NumberFormat("en-US");
const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function rowKeyOf(row: Record<string, unknown>, idKey: string, index: number): string {
  const v = row[idKey];
  return v === undefined || v === null ? String(index) : String(v);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function compareValues(a: unknown, b: unknown, type: ColumnType): number {
  const an = a === null || a === undefined;
  const bn = b === null || b === undefined;
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (type === "number") return Number(a) - Number(b);
  if (type === "boolean") return a === b ? 0 : a ? 1 : -1;
  if (type === "date") return (toDate(a)?.getTime() ?? 0) - (toDate(b)?.getTime() ?? 0);
  return String(a).localeCompare(String(b));
}

function formatCell(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined) return "—";
  if (type === "number") return numberFmt.format(Number(value));
  if (type === "date") {
    const d = toDate(value);
    return d ? dateFmt.format(d) : String(value);
  }
  if (type === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function badgeColor(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return BADGE_PALETTE[h % BADGE_PALETTE.length];
}

function matchesSearch(row: Record<string, unknown>, columns: Column[], q: string): boolean {
  const needle = q.toLowerCase();
  return columns.some((c) =>
    String(row[c.key] ?? "")
      .toLowerCase()
      .includes(needle),
  );
}

function facetValues(
  rows: Record<string, unknown>[],
  key: string,
): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = String(r[key] ?? "—");
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([value, count]) => ({ count, value }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export function DataGrid({
  columns,
  rows,
  idKey = "id",
  pageSize = 8,
  selectable = true,
  searchable = true,
  className,
}: DataGridProps) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [search, setSearch] = useState("");
  const [facetFilters, setFacetFilters] = useState<Map<string, Set<string>>>(() => new Map());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const colByKey = useMemo(() => {
    const m = new Map<string, Column>();
    for (const c of columns) m.set(c.key, c);
    return m;
  }, [columns]);

  const visibleCols = columns.filter((c) => !hiddenCols.has(c.key));
  const facetCols = columns.filter((c) => c.facet);

  const keyed = useMemo(
    () => rows.map((row, index) => ({ key: rowKeyOf(row, idKey, index), row })),
    [rows, idKey],
  );

  const filtered = useMemo(() => {
    return keyed.filter(({ row }) => {
      if (search && !matchesSearch(row, columns, search)) return false;
      for (const [key, set] of facetFilters) {
        if (set.size > 0 && !set.has(String(row[key] ?? "—"))) return false;
      }
      return true;
    });
  }, [keyed, columns, search, facetFilters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = colByKey.get(sort.key);
    const type = col?.type ?? "text";
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => dir * compareValues(a.row[sort.key], b.row[sort.key], type),
    );
  }, [filtered, sort, colByKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const allKeys = sorted.map((r) => r.key);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = allKeys.some((k) => selected.has(k));

  const resetPage = () => setPage(0);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { dir: "asc", key };
      if (prev.dir === "asc") return { dir: "desc", key };
      return null;
    });
  };

  const toggleFacet = (key: string, value: string) => {
    setFacetFilters((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(key) ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next.set(key, set);
      return next;
    });
    resetPage();
  };

  const toggleCol = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) for (const k of allKeys) next.delete(k);
      else for (const k of allKeys) next.add(k);
      return next;
    });
  };

  const renderCell = (col: Column, value: unknown) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">—</span>;
    if (col.type === "boolean") {
      return value ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <span className="text-muted-foreground">No</span>
      );
    }
    if (col.type === "badge") {
      const v = String(value);
      const c = badgeColor(v);
      return (
        <span
          className="rounded-full px-1.5 py-0.5 font-medium text-[11px]"
          style={{ background: `${c}1f`, color: c }}
        >
          {v}
        </span>
      );
    }
    return (
      <span className={col.type === "number" ? "tabular-nums" : undefined}>
        {formatCell(value, col.type ?? "text")}
      </span>
    );
  };

  const alignClass = (col: Column) =>
    (col.align ?? (col.type === "number" ? "right" : "left")) === "right"
      ? "text-right"
      : "text-left";

  return (
    <div className={cn("rounded-lg border border-border bg-card text-xs", className)}>
      <div className="flex flex-wrap items-center gap-2 border-border border-b p-2">
        {searchable ? (
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 w-44 pl-7 text-xs"
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search…"
              value={search}
            />
          </div>
        ) : null}

        {facetCols.map((col) => {
          const selectedVals = facetFilters.get(col.key) ?? new Set<string>();
          const values = facetValues(rows, col.key);
          return (
            <DropdownMenu key={col.key}>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs transition-colors hover:bg-muted",
                  selectedVals.size > 0 && "border-foreground/30 text-foreground",
                )}
              >
                <ListFilter className="size-3.5" />
                {col.label}
                {selectedVals.size > 0 ? ` (${selectedVals.size})` : ""}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="px-1.5 py-1 font-medium text-muted-foreground text-xs">
                  {col.label}
                </div>
                {values.map((v) => (
                  <DropdownMenuCheckboxItem
                    checked={selectedVals.has(v.value)}
                    key={v.value}
                    onCheckedChange={() => toggleFacet(col.key, v.value)}
                  >
                    <span className="capitalize">{v.value}</span>
                    <span className="ml-auto pl-3 text-muted-foreground tabular-nums">
                      {v.count}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs transition-colors hover:bg-muted">
            <Columns3 className="size-3.5" />
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-1.5 py-1 font-medium text-muted-foreground text-xs">
              Toggle columns
            </div>
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                checked={!hiddenCols.has(col.key)}
                key={col.key}
                onCheckedChange={() => toggleCol(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectable && selected.size > 0 ? (
          <span className="text-muted-foreground">{selected.size} selected</span>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead className="w-8">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={() => toggleAll()}
                />
              </TableHead>
            ) : null}
            {visibleCols.map((col) => {
              const sortable = col.sortable ?? true;
              const active = sort?.key === col.key;
              return (
                <TableHead className={alignClass(col)} key={col.key}>
                  {sortable ? (
                    <button
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      onClick={() => handleSort(col.key)}
                      type="button"
                    >
                      {col.label}
                      {active ? (
                        sort.dir === "asc" ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center text-muted-foreground italic"
                colSpan={visibleCols.length + (selectable ? 1 : 0)}
              >
                No results
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map(({ row, key }) => (
              <TableRow className={cn(selected.has(key) && "bg-muted/40")} key={key}>
                {selectable ? (
                  <TableCell className="w-8">
                    <Checkbox
                      aria-label="Select row"
                      checked={selected.has(key)}
                      onCheckedChange={() => toggleRow(key)}
                    />
                  </TableCell>
                ) : null}
                {visibleCols.map((col) => (
                  <TableCell className={alignClass(col)} key={col.key}>
                    {renderCell(col, row[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-2 border-border border-t p-2 text-muted-foreground">
        <span>
          {sorted.length} of {rows.length} row{rows.length === 1 ? "" : "s"}
          {selectable && selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            type="button"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </button>
          <span className="tabular-nums">
            Page {safePage + 1} / {pageCount}
          </span>
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            type="button"
          >
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataGrid;
