"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ColType =
  | "bigint"
  | "boolean"
  | "double"
  | "integer"
  | "jsonb"
  | "text"
  | "timestamp"
  | "uuid";

export interface Column {
  avgBytes: number;
  name: string;
  nullable: boolean;
  type: ColType;
}

export interface StorageEstimatorProps {
  className?: string;
  defaultColumns?: Column[];
  defaultRowCount?: number;
}

interface EditColumn {
  avgBytes: string;
  name: string;
  nullable: boolean;
  type: ColType;
}

const COLOR_ERROR = "#ef4444";
const HEADER_BYTES = 24;
const VARLENA_BYTES = 4;

const TYPE_BYTES: Record<ColType, number | null> = {
  bigint: 8,
  boolean: 1,
  double: 8,
  integer: 4,
  jsonb: null,
  text: null,
  timestamp: 8,
  uuid: 16,
};

const COL_TYPES: ColType[] = [
  "bigint",
  "boolean",
  "double",
  "integer",
  "jsonb",
  "text",
  "timestamp",
  "uuid",
];

const NUM = new Intl.NumberFormat("en-US");

const DEFAULT_COLUMNS: Column[] = [
  { avgBytes: 0, name: "id", nullable: false, type: "uuid" },
  { avgBytes: 0, name: "user_id", nullable: false, type: "bigint" },
  { avgBytes: 0, name: "created_at", nullable: false, type: "timestamp" },
  { avgBytes: 12, name: "status", nullable: false, type: "text" },
  { avgBytes: 256, name: "payload", nullable: false, type: "jsonb" },
  { avgBytes: 0, name: "active", nullable: true, type: "boolean" },
];

export function isVariable(type: ColType): boolean {
  return TYPE_BYTES[type] === null;
}

export function colBytes(type: ColType, avgBytes: number): number {
  const fixed = TYPE_BYTES[type];
  if (fixed !== null) return fixed;
  const avg = Number.isFinite(avgBytes) && avgBytes >= 0 ? Math.round(avgBytes) : 0;
  return avg + VARLENA_BYTES;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  let v = n;
  let unit = "B";
  for (const u of ["KiB", "MiB", "GiB", "TiB"]) {
    v /= 1024;
    unit = u;
    if (v < 1024) break;
  }
  return `${v.toFixed(1)} ${unit}`;
}

export function StorageEstimator({
  className,
  defaultColumns = DEFAULT_COLUMNS,
  defaultRowCount = 1_000_000,
}: StorageEstimatorProps) {
  const [columns, setColumns] = useState<EditColumn[]>(
    defaultColumns.map((c) => ({
      avgBytes: String(c.avgBytes),
      name: c.name,
      nullable: c.nullable,
      type: c.type,
    })),
  );
  const [rowCount, setRowCount] = useState(String(defaultRowCount));

  const rowsParsed = Number.parseFloat(rowCount);
  const rowsValid = Number.isFinite(rowsParsed) && rowsParsed >= 1;
  const rowsN = rowsValid ? Math.round(rowsParsed) : 0;

  const perCol = columns.map((c) => colBytes(c.type, Number.parseFloat(c.avgBytes)));
  const columnsBytes = perCol.reduce((a, b) => a + b, 0);
  const bitmapBytes = columns.some((c) => c.nullable) ? Math.ceil(columns.length / 8) : 0;
  const rowBytes = HEADER_BYTES + bitmapBytes + columnsBytes;
  const totalBytes = rowBytes * rowsN;

  const update = (i: number, patch: Partial<EditColumn>) => {
    setColumns((cols) => cols.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };
  const remove = (i: number) => {
    setColumns((cols) => cols.filter((_, j) => j !== i));
  };
  const add = () => {
    setColumns((cols) => [
      ...cols,
      {
        avgBytes: "0",
        name: `col_${cols.length + 1}`,
        nullable: false,
        type: "integer",
      },
    ]);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 border-border border-b p-3">
        {columns.length === 0 && <p className="text-muted-foreground">no columns — add one</p>}
        {columns.map((c, i) => (
          <div className="flex flex-wrap items-center gap-1.5" key={i}>
            <input
              aria-label={`Column ${i + 1} name`}
              className="h-7 w-28 rounded-md border border-border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring"
              onChange={(e) => {
                update(i, { name: e.target.value });
              }}
              spellCheck={false}
              type="text"
              value={c.name}
            />
            <select
              aria-label={`Column ${i + 1} type`}
              className="h-7 rounded-md border border-border bg-transparent px-1 font-mono text-xs outline-none focus:border-ring"
              onChange={(e) => {
                update(i, { type: e.target.value as ColType });
              }}
              value={c.type}
            >
              {COL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {isVariable(c.type) && (
              <span className="flex items-center gap-1">
                <input
                  aria-label={`Column ${i + 1} average bytes`}
                  className="h-7 w-16 rounded-md border border-border bg-transparent px-2 text-right font-mono text-xs outline-none focus:border-ring"
                  onChange={(e) => {
                    update(i, { avgBytes: e.target.value });
                  }}
                  spellCheck={false}
                  type="text"
                  value={c.avgBytes}
                />
                <span className="text-muted-foreground">B avg</span>
              </span>
            )}
            <button
              aria-label={`Toggle nullable for ${c.name}`}
              className={cn(
                "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                c.nullable
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => {
                update(i, { nullable: !c.nullable });
              }}
              type="button"
            >
              null?
            </button>
            <span className="ml-auto font-mono text-muted-foreground">
              {fmtBytes(perCol[i] ?? 0)}
            </span>
            <button
              aria-label={`Remove ${c.name}`}
              className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                remove(i);
              }}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="self-start rounded-md border border-border px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={add}
          type="button"
        >
          + add column
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">rows:</span>
          <input
            aria-label="Row count"
            className={cn(
              "h-7 w-28 rounded-md border bg-transparent px-2 text-right font-mono text-xs outline-none focus:border-ring",
              rowsValid ? "border-border" : "border-red-500",
            )}
            onChange={(e) => {
              setRowCount(e.target.value);
            }}
            spellCheck={false}
            type="text"
            value={rowCount}
          />
        </div>
        <p className="font-mono">
          row size: header {HEADER_BYTES} B
          {bitmapBytes > 0 ? ` + null bitmap ${bitmapBytes} B` : ""} + columns{" "}
          {NUM.format(columnsBytes)} B ={" "}
          <span className="font-medium">{NUM.format(rowBytes)} B/row</span>
        </p>
        {rowsValid ? (
          <p className="font-mono">
            total: × {NUM.format(rowsN)} rows ≈{" "}
            <span className="font-medium">{fmtBytes(totalBytes)}</span>
          </p>
        ) : (
          <p style={{ color: COLOR_ERROR }}>enter a row count ≥ 1</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          simplified postgres-like model — ignores alignment padding and TOAST
        </p>
      </div>
    </div>
  );
}

export default StorageEstimator;
