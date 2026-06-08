"use client";

import { Columns2, Rows3 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface DiffViewerProps {
  before: unknown;
  after: unknown;
  defaultView?: "unified" | "split";
  defaultOnlyChanges?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

type ValueType = "string" | "number" | "boolean" | "null" | "undefined" | "object" | "array";
type DiffStatus = "added" | "removed" | "changed" | "unchanged";
type Path = (string | number)[];
type ParseResult = { ok: true; value: unknown } | { ok: false; error: string; raw: string };

function parseInput(data: unknown): ParseResult {
  if (typeof data === "string") {
    try {
      return { ok: true, value: JSON.parse(data) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Invalid JSON", ok: false, raw: data };
    }
  }
  return { ok: true, value: data };
}

function typeOf(value: unknown): ValueType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "object") return t;
  return "string";
}

function isContainer(t: ValueType): boolean {
  return t === "object" || t === "array";
}

function entriesOf(value: unknown, type: ValueType): [string | number, unknown][] {
  if (type === "array") return (value as unknown[]).map((v, i) => [i, v]);
  return Object.entries(value as Record<string, unknown>);
}

function keyOf(path: Path): string {
  return JSON.stringify(path);
}

function formatPrimitive(value: unknown, type: ValueType): string {
  if (type === "string") return JSON.stringify(value);
  if (type === "null") return "null";
  if (type === "undefined") return "undefined";
  return String(value);
}

/** Display string for a value: primitives formatted, containers summarized. */
function display(value: unknown, type?: ValueType): string {
  const t = type ?? typeOf(value);
  if (isContainer(t)) return t === "array" ? "[ … ]" : "{ … }";
  return formatPrimitive(value, t);
}

interface DiffNode {
  status: DiffStatus;
  type: ValueType;
  oldValue?: unknown;
  newValue?: unknown;
  children?: { key: string | number; node: DiffNode }[];
}

/** Build a one-sided subtree where every node has `status` (added or removed). */
function buildSide(value: unknown, status: "added" | "removed"): DiffNode {
  const type = typeOf(value);
  if (isContainer(type)) {
    const children = entriesOf(value, type).map(([key, v]) => ({
      key,
      node: buildSide(v, status),
    }));
    return { children, status, type };
  }
  return status === "added" ? { newValue: value, status, type } : { oldValue: value, status, type };
}

function diffChildren(before: unknown, after: unknown, type: ValueType) {
  const out: { key: string | number; node: DiffNode }[] = [];
  if (type === "array") {
    const b = before as unknown[];
    const a = after as unknown[];
    const len = Math.max(b.length, a.length);
    for (let i = 0; i < len; i++) {
      const inB = i < b.length;
      const inA = i < a.length;
      if (inB && inA) out.push({ key: i, node: diffTree(b[i], a[i]) });
      else if (inA) out.push({ key: i, node: buildSide(a[i], "added") });
      else out.push({ key: i, node: buildSide(b[i], "removed") });
    }
    return out;
  }
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys: string[] = [];
  for (const k of Object.keys(b)) keys.push(k);
  for (const k of Object.keys(a)) if (!(k in b)) keys.push(k);
  for (const k of keys) {
    const inB = k in b;
    const inA = k in a;
    if (inB && inA) out.push({ key: k, node: diffTree(b[k], a[k]) });
    else if (inA) out.push({ key: k, node: buildSide(a[k], "added") });
    else out.push({ key: k, node: buildSide(b[k], "removed") });
  }
  return out;
}

function diffTree(before: unknown, after: unknown): DiffNode {
  const bt = typeOf(before);
  const at = typeOf(after);
  if (isContainer(bt) && isContainer(at) && bt === at) {
    const children = diffChildren(before, after, at);
    const changed = children.some((c) => c.node.status !== "unchanged");
    return { children, status: changed ? "changed" : "unchanged", type: at };
  }
  // primitive vs primitive, or any structural mismatch → leaf compare
  if (Object.is(before, after)) {
    return { newValue: after, oldValue: before, status: "unchanged", type: at };
  }
  return { newValue: after, oldValue: before, status: "changed", type: at };
}

function countStatuses(root: DiffNode): { added: number; removed: number; changed: number } {
  const c = { added: 0, changed: 0, removed: 0 };
  function walk(n: DiffNode) {
    if (n.status === "added") {
      c.added++;
      return;
    }
    if (n.status === "removed") {
      c.removed++;
      return;
    }
    if (n.status === "changed") {
      if (n.children) for (const ch of n.children) walk(ch.node);
      else c.changed++;
    }
  }
  walk(root);
  return c;
}

interface DiffRow {
  id: string;
  depth: number;
  keyLabel?: string | number;
  status: DiffStatus;
  variant: "open" | "close" | "primitive";
  bracket?: "{" | "}" | "[" | "]";
  valueType: ValueType;
  oldValue?: unknown;
  newValue?: unknown;
  trailingComma?: boolean;
}

function hasChange(n: DiffNode): boolean {
  return n.status !== "unchanged";
}

function flattenDiff(root: DiffNode, onlyChanges: boolean): DiffRow[] {
  const rows: DiffRow[] = [];

  function pushNode(
    node: DiffNode,
    path: Path,
    keyLabel: string | number | undefined,
    trailingComma: boolean,
  ) {
    if (onlyChanges && !hasChange(node)) return;
    const k = keyOf(path);
    const depth = path.length;

    if (node.children && isContainer(node.type)) {
      const isArray = node.type === "array";
      rows.push({
        bracket: isArray ? "[" : "{",
        depth,
        id: k,
        keyLabel,
        status: node.status,
        trailingComma: false,
        valueType: node.type,
        variant: "open",
      });
      const visible = onlyChanges ? node.children.filter((c) => hasChange(c.node)) : node.children;
      visible.forEach((c, i) => {
        pushNode(c.node, [...path, c.key], c.key, i < visible.length - 1);
      });
      rows.push({
        bracket: isArray ? "]" : "}",
        depth,
        id: `${k}:close`,
        status: node.status,
        trailingComma,
        valueType: node.type,
        variant: "close",
      });
      return;
    }

    rows.push({
      depth,
      id: k,
      keyLabel,
      newValue: node.newValue,
      oldValue: node.oldValue,
      status: node.status,
      trailingComma,
      valueType: node.type,
      variant: "primitive",
    });
  }

  pushNode(root, [], undefined, false);
  return rows;
}

const STATUS_ROW: Record<DiffStatus, string> = {
  added: "bg-emerald-500/10",
  changed: "bg-amber-500/10",
  removed: "bg-red-500/10",
  unchanged: "",
};

const STATUS_SIGN: Record<DiffStatus, string> = {
  added: "+",
  changed: "~",
  removed: "-",
  unchanged: " ",
};

const STATUS_TEXT: Record<DiffStatus, string> = {
  added: "text-emerald-600 dark:text-emerald-400",
  changed: "text-amber-600 dark:text-amber-400",
  removed: "text-red-600 dark:text-red-400",
  unchanged: "text-muted-foreground",
};

/** The value (or bracket) portion of a row. `which` selects the side for changed rows. */
function valueNode(row: DiffRow, which: "unified" | "old" | "new"): ReactNode {
  if (row.variant !== "primitive") {
    return <span className="text-muted-foreground">{row.bracket}</span>;
  }
  if (row.status === "changed") {
    if (which === "old") {
      return (
        <span className="text-red-600 line-through dark:text-red-400">{display(row.oldValue)}</span>
      );
    }
    if (which === "new") {
      return (
        <span className="text-emerald-600 dark:text-emerald-400">{display(row.newValue)}</span>
      );
    }
    return (
      <>
        <span className="text-red-600 line-through opacity-70 dark:text-red-400">
          {display(row.oldValue)}
        </span>
        <span className="mx-1 text-muted-foreground">→</span>
        <span className="text-emerald-600 dark:text-emerald-400">{display(row.newValue)}</span>
      </>
    );
  }
  const value = row.status === "removed" ? row.oldValue : row.newValue;
  return <span className={STATUS_TEXT[row.status]}>{display(value, row.valueType)}</span>;
}

/** Indented key + value content for one cell/line. */
function lineContent(row: DiffRow, which: "unified" | "old" | "new"): ReactNode {
  const showKey = typeof row.keyLabel === "string";
  return (
    <div className="flex-1 whitespace-pre" style={{ paddingLeft: row.depth * 14 }}>
      {showKey ? <span className="text-foreground">{`"${row.keyLabel}"`}: </span> : null}
      {valueNode(row, which)}
      {row.trailingComma ? <span className="text-muted-foreground">,</span> : null}
    </div>
  );
}

function Gutter({ n, show }: { n: number | null; show: boolean }) {
  if (!show) return null;
  return (
    <span className="w-7 shrink-0 select-none pr-1 text-right text-[10px] text-muted-foreground/50 tabular-nums leading-5">
      {n ?? ""}
    </span>
  );
}

function UnifiedLine({
  row,
  lineNo,
  showLineNumbers,
}: {
  row: DiffRow;
  lineNo: number;
  showLineNumbers: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-1.5 px-2 leading-5", STATUS_ROW[row.status])}>
      <Gutter n={lineNo} show={showLineNumbers} />
      <span className={cn("w-3 shrink-0 select-none text-center", STATUS_TEXT[row.status])}>
        {STATUS_SIGN[row.status]}
      </span>
      {lineContent(row, "unified")}
    </div>
  );
}

function SplitLine({
  row,
  lineNo,
  showLineNumbers,
}: {
  row: DiffRow;
  lineNo: number;
  showLineNumbers: boolean;
}) {
  const leftShown = row.status !== "added";
  const rightShown = row.status !== "removed";
  const leftBg =
    row.status === "removed"
      ? "bg-red-500/10"
      : row.status === "changed"
        ? "bg-amber-500/10"
        : row.status === "added"
          ? "bg-muted/20"
          : "";
  const rightBg =
    row.status === "added"
      ? "bg-emerald-500/10"
      : row.status === "changed"
        ? "bg-amber-500/10"
        : row.status === "removed"
          ? "bg-muted/20"
          : "";
  return (
    <div className="grid grid-cols-2 leading-5">
      <div className={cn("flex items-start gap-1.5 border-border border-r px-2", leftBg)}>
        <Gutter n={leftShown ? lineNo : null} show={showLineNumbers} />
        {leftShown ? lineContent(row, "old") : <div className="flex-1" />}
      </div>
      <div className={cn("flex items-start gap-1.5 px-2", rightBg)}>
        <Gutter n={rightShown ? lineNo : null} show={showLineNumbers} />
        {rightShown ? lineContent(row, "new") : <div className="flex-1" />}
      </div>
    </div>
  );
}

export function DiffViewer({
  before,
  after,
  defaultView = "unified",
  defaultOnlyChanges = false,
  showLineNumbers = true,
  className,
}: DiffViewerProps) {
  const beforeParsed = useMemo(() => parseInput(before), [before]);
  const afterParsed = useMemo(() => parseInput(after), [after]);
  const [view, setView] = useState<"unified" | "split">(defaultView);
  const [onlyChanges, setOnlyChanges] = useState(defaultOnlyChanges);

  const tree = useMemo(
    () =>
      beforeParsed.ok && afterParsed.ok ? diffTree(beforeParsed.value, afterParsed.value) : null,
    [beforeParsed, afterParsed],
  );
  const counts = useMemo(
    () => (tree ? countStatuses(tree) : { added: 0, changed: 0, removed: 0 }),
    [tree],
  );
  const rows = useMemo(() => (tree ? flattenDiff(tree, onlyChanges) : []), [tree, onlyChanges]);

  if (!beforeParsed.ok || !afterParsed.ok) {
    const err = !beforeParsed.ok ? beforeParsed : (afterParsed as { error: string; raw: string });
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs",
          className,
        )}
      >
        <p className="mb-2 font-medium font-sans text-destructive">Invalid JSON — {err.error}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-muted-foreground">{err.raw}</pre>
      </div>
    );
  }

  const segBtn = (active: boolean) =>
    cn(
      "flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors",
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 font-mono text-xs", className)}>
      <div className="flex flex-wrap items-center gap-2 border-border border-b px-2 py-1.5 font-sans">
        <div className="flex rounded-md border border-border p-0.5">
          <button
            className={segBtn(view === "unified")}
            onClick={() => setView("unified")}
            type="button"
          >
            <Rows3 className="size-3" /> Unified
          </button>
          <button
            className={segBtn(view === "split")}
            onClick={() => setView("split")}
            type="button"
          >
            <Columns2 className="size-3" /> Split
          </button>
        </div>
        <button
          className={segBtn(onlyChanges)}
          onClick={() => setOnlyChanges((v) => !v)}
          type="button"
        >
          Only changes
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">+{counts.added}</span>
          <span className="text-red-600 dark:text-red-400">-{counts.removed}</span>
          <span className="text-amber-600 dark:text-amber-400">~{counts.changed}</span>
        </div>
      </div>

      <div className="overflow-x-auto py-1.5">
        {rows.length === 0 ? (
          <p className="px-3 py-2 font-sans text-muted-foreground text-xs italic">No differences</p>
        ) : (
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={view}
              transition={{ duration: 0.12 }}
            >
              {rows.map((row, i) =>
                view === "unified" ? (
                  <UnifiedLine
                    key={row.id}
                    lineNo={i + 1}
                    row={row}
                    showLineNumbers={showLineNumbers}
                  />
                ) : (
                  <SplitLine
                    key={row.id}
                    lineNo={i + 1}
                    row={row}
                    showLineNumbers={showLineNumbers}
                  />
                ),
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default DiffViewer;
