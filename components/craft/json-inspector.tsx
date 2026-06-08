"use client";

import { Braces, Check, ChevronRight, Copy, type LucideIcon, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface JsonInspectorProps {
  data: unknown;
  defaultExpandedDepth?: number;
  searchable?: boolean;
  showLineNumbers?: boolean;
  rootName?: string;
  className?: string;
}

type ValueType = "string" | "number" | "boolean" | "null" | "undefined" | "object" | "array";
type Path = (string | number)[];

interface FlatRow {
  id: string;
  path: Path;
  depth: number;
  keyLabel?: string | number;
  variant: "open" | "close" | "primitive";
  bracket?: "{" | "}" | "[" | "]";
  value?: unknown;
  raw?: unknown;
  valueType: ValueType;
  size?: number;
  collapsed?: boolean;
  expandable?: boolean;
  trailingComma?: boolean;
}

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

function keyOf(path: Path): string {
  return JSON.stringify(path);
}

function entriesOf(value: unknown, type: ValueType): [string | number, unknown][] {
  if (type === "array") return (value as unknown[]).map((v, i) => [i, v]);
  return Object.entries(value as Record<string, unknown>);
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function pathToString(path: Path, rootName: string): string {
  let s = rootName;
  for (const seg of path) {
    if (typeof seg === "number") s += `[${seg}]`;
    else if (IDENT.test(seg)) s += `.${seg}`;
    else s += `[${JSON.stringify(seg)}]`;
  }
  return s;
}

function formatPrimitive(value: unknown, type: ValueType): string {
  if (type === "string") return JSON.stringify(value);
  if (type === "null") return "null";
  if (type === "undefined") return "undefined";
  return String(value);
}

function primitiveText(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return String(value);
}

function valueText(raw: unknown): string {
  const t = typeOf(raw);
  if (isContainer(t)) return JSON.stringify(raw, null, 2);
  if (t === "string") return raw as string;
  return primitiveText(raw);
}

function sizeLabel(row: FlatRow): string {
  const n = row.size ?? 0;
  return row.valueType === "array"
    ? `${n} item${n === 1 ? "" : "s"}`
    : `${n} key${n === 1 ? "" : "s"}`;
}

function defaultOpen(value: unknown, depth: number): Set<string> {
  const open = new Set<string>();
  function walk(v: unknown, path: Path) {
    const t = typeOf(v);
    if (!isContainer(t)) return;
    if (path.length < depth) {
      open.add(keyOf(path));
      for (const [k, child] of entriesOf(v, t)) walk(child, [...path, k]);
    }
  }
  walk(value, []);
  return open;
}

function allContainers(value: unknown): Set<string> {
  const out = new Set<string>();
  function walk(v: unknown, path: Path) {
    const t = typeOf(v);
    if (!isContainer(t)) return;
    out.add(keyOf(path));
    for (const [k, child] of entriesOf(v, t)) walk(child, [...path, k]);
  }
  walk(value, []);
  return out;
}

function computeSearch(value: unknown, query: string): { visible: Set<string>; matches: number } {
  const visible = new Set<string>();
  const q = query.toLowerCase();
  let matches = 0;

  function markAll(v: unknown, path: Path) {
    visible.add(keyOf(path));
    const t = typeOf(v);
    if (isContainer(t)) for (const [k, child] of entriesOf(v, t)) markAll(child, [...path, k]);
  }

  function walk(v: unknown, path: Path, keyLabel: string | number | undefined): boolean {
    const t = typeOf(v);
    const keyMatch = keyLabel !== undefined && String(keyLabel).toLowerCase().includes(q);
    if (isContainer(t)) {
      if (keyMatch) {
        matches++;
        markAll(v, path);
        return true;
      }
      let childVisible = false;
      for (const [k, child] of entriesOf(v, t)) {
        if (walk(child, [...path, k], k)) childVisible = true;
      }
      if (childVisible) {
        visible.add(keyOf(path));
        return true;
      }
      return false;
    }
    const valMatch = primitiveText(v).toLowerCase().includes(q);
    if (keyMatch || valMatch) {
      matches++;
      visible.add(keyOf(path));
      return true;
    }
    return false;
  }

  walk(value, [], undefined);
  return { matches, visible };
}

interface SearchState {
  active: boolean;
  visible: Set<string>;
  matches: number;
}

function flatten(value: unknown, openPaths: Set<string>, search: SearchState): FlatRow[] {
  const rows: FlatRow[] = [];

  function isOpen(path: Path): boolean {
    if (search.active) return true;
    return openPaths.has(keyOf(path));
  }

  function pushNode(
    v: unknown,
    path: Path,
    keyLabel: string | number | undefined,
    trailingComma: boolean,
  ) {
    const k = keyOf(path);
    if (search.active && !search.visible.has(k)) return;
    const type = typeOf(v);
    const depth = path.length;

    if (!isContainer(type)) {
      rows.push({
        depth,
        id: k,
        keyLabel,
        path,
        raw: v,
        trailingComma,
        value: v,
        valueType: type,
        variant: "primitive",
      });
      return;
    }

    const entries = entriesOf(v, type);
    const childEntries = search.active
      ? entries.filter(([ck]) => search.visible.has(keyOf([...path, ck])))
      : entries;
    const open = isOpen(path) && childEntries.length > 0;
    const isArray = type === "array";

    rows.push({
      bracket: isArray ? "[" : "{",
      collapsed: !open,
      depth,
      expandable: entries.length > 0,
      id: k,
      keyLabel,
      path,
      raw: v,
      size: entries.length,
      trailingComma: open ? false : trailingComma,
      valueType: type,
      variant: "open",
    });

    if (!open) return;

    childEntries.forEach(([ck, cv], i) => {
      pushNode(cv, [...path, ck], ck, i < childEntries.length - 1);
    });

    rows.push({
      bracket: isArray ? "]" : "}",
      depth,
      id: `${k}:close`,
      path,
      trailingComma,
      valueType: type,
      variant: "close",
    });
  }

  pushNode(value, [], undefined, false);
  return rows;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return {
    copied,
    copy: (text: string) => {
      void navigator.clipboard?.writeText(text);
      setCopied(true);
    },
  };
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(q);
  let n = 0;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        className="rounded bg-yellow-300/50 text-foreground dark:bg-yellow-500/30"
        key={`m${n}`}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    n++;
    i = idx + q.length;
    idx = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

function CopyAction({
  text,
  label,
  icon: Icon,
}: {
  text: string;
  label: string;
  icon: LucideIcon;
}) {
  const { copied, copy } = useCopy();
  return (
    <button
      aria-label={`Copy ${label}`}
      className={cn(
        "flex items-center gap-1 rounded px-1 py-0.5 font-sans text-[10px] transition-colors hover:bg-muted",
        copied
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => copy(text)}
      title={`Copy ${label}`}
      type="button"
    >
      {copied ? <Check className="size-3" /> : <Icon className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

const TYPE_CLASS: Record<ValueType, string> = {
  array: "text-muted-foreground",
  boolean: "text-blue-600 dark:text-blue-400",
  null: "text-muted-foreground italic",
  number: "text-orange-600 dark:text-orange-400",
  object: "text-muted-foreground",
  string: "text-emerald-600 dark:text-emerald-400",
  undefined: "text-muted-foreground italic",
};

function Row({
  row,
  lineNo,
  query,
  rootName,
  showLineNumbers,
  onToggle,
}: {
  row: FlatRow;
  lineNo: number;
  query: string;
  rootName: string;
  showLineNumbers: boolean;
  onToggle: () => void;
}) {
  const showKey = typeof row.keyLabel === "string";
  return (
    <div className="group/row flex items-start gap-1.5 hover:bg-muted/40">
      {showLineNumbers ? (
        <span className="w-8 shrink-0 select-none pr-1 text-right text-[10px] text-muted-foreground/50 tabular-nums leading-5">
          {lineNo}
        </span>
      ) : null}
      <div className="flex-1 whitespace-pre leading-5" style={{ paddingLeft: row.depth * 14 }}>
        {row.variant !== "close" && row.expandable ? (
          <button
            aria-label={row.collapsed ? "Expand" : "Collapse"}
            className="mr-0.5 inline-flex translate-y-px text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            type="button"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", !row.collapsed && "rotate-90")}
            />
          </button>
        ) : (
          <span className="mr-0.5 inline-block w-3" />
        )}
        {showKey ? (
          <span className="text-foreground">
            <Highlight query={query} text={`"${row.keyLabel}"`} />
            {": "}
          </span>
        ) : null}
        {row.variant === "primitive" ? (
          <span className={TYPE_CLASS[row.valueType]}>
            <Highlight query={query} text={formatPrimitive(row.value, row.valueType)} />
          </span>
        ) : null}
        {row.variant === "open" ? (
          row.collapsed ? (
            row.size === 0 ? (
              <span className="text-muted-foreground">
                {row.bracket}
                {row.bracket === "[" ? "]" : "}"}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {row.bracket} … {row.bracket === "[" ? "]" : "}"}{" "}
                <span className="text-[10px]">{sizeLabel(row)}</span>
              </span>
            )
          ) : (
            <span className="text-muted-foreground">{row.bracket}</span>
          )
        ) : null}
        {row.variant === "close" ? (
          <span className="text-muted-foreground">{row.bracket}</span>
        ) : null}
        {row.trailingComma ? <span className="text-muted-foreground">,</span> : null}
      </div>
      {row.variant !== "close" ? (
        <span className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          <CopyAction icon={Braces} label="path" text={pathToString(row.path, rootName)} />
          <CopyAction icon={Copy} label="value" text={valueText(row.raw)} />
        </span>
      ) : null}
    </div>
  );
}

export function JsonInspector({
  data,
  defaultExpandedDepth = 1,
  searchable = true,
  showLineNumbers = true,
  rootName = "root",
  className,
}: JsonInspectorProps) {
  const parsed = useMemo(() => parseInput(data), [data]);
  const [query, setQuery] = useState("");
  const [openPaths, setOpenPaths] = useState<Set<string>>(() =>
    parsed.ok ? defaultOpen(parsed.value, defaultExpandedDepth) : new Set(),
  );

  const search = useMemo<SearchState>(() => {
    if (!parsed.ok || !searchable || query.trim() === "") {
      return { active: false, matches: 0, visible: new Set() };
    }
    return { active: true, ...computeSearch(parsed.value, query.trim()) };
  }, [parsed, query, searchable]);

  const rows = useMemo(
    () => (parsed.ok ? flatten(parsed.value, openPaths, search) : []),
    [parsed, openPaths, search],
  );

  const searchRef = useRef<HTMLDivElement>(null);
  const focusSearch = () => searchRef.current?.querySelector("input")?.focus();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive, we only want to bind this once when searchable is enabled
  useEffect(() => {
    if (!searchable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement | null)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      focusSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchable]);

  if (!parsed.ok) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs",
          className,
        )}
      >
        <p className="mb-2 font-medium font-sans text-destructive">Invalid JSON — {parsed.error}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-muted-foreground">
          {parsed.raw}
        </pre>
      </div>
    );
  }

  const toggle = (path: Path) => {
    const k = keyOf(path);
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 font-mono text-xs", className)}>
      <div className="flex items-center gap-2 border-border border-b px-2 py-1.5">
        {searchable ? (
          <InputGroup className="h-7 flex-1 font-sans" ref={searchRef}>
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-xs"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search keys or values…"
              value={query}
            />
            <InputGroupAddon align="inline-end">
              {search.active ? (
                <InputGroupText className="text-xs">
                  {search.matches} match{search.matches === 1 ? "" : "es"}
                </InputGroupText>
              ) : null}
              {query ? (
                <InputGroupButton
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    focusSearch();
                  }}
                  size="icon-xs"
                >
                  <X className="size-3.5" />
                </InputGroupButton>
              ) : (
                <kbd className="rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
                  /
                </kbd>
              )}
            </InputGroupAddon>
          </InputGroup>
        ) : null}
        <div className="ml-auto flex shrink-0 gap-1 font-sans">
          <button
            className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
            onClick={() => setOpenPaths(allContainers(parsed.value))}
            type="button"
          >
            Expand all
          </button>
          <button
            className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
            onClick={() => setOpenPaths(new Set())}
            type="button"
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="overflow-x-auto py-1.5">
        {rows.length === 0 ? (
          <p className="px-3 py-2 font-sans text-muted-foreground text-xs italic">
            {search.active ? "No matches" : "Empty"}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((row, i) => (
              <motion.div
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={row.id}
                layout
                transition={{ duration: 0.12 }}
              >
                <Row
                  lineNo={i + 1}
                  onToggle={() => toggle(row.path)}
                  query={search.active ? query.trim() : ""}
                  rootName={rootName}
                  row={row}
                  showLineNumbers={showLineNumbers}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default JsonInspector;
