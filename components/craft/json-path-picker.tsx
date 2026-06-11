"use client";

import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface JsonPathPickerProps {
  data: unknown;
  onSelect?: (path: string) => void;
  className?: string;
}

type Segment = string | number;

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function keyOf(segs: Segment[]): string {
  return JSON.stringify(segs);
}

function formatPath(segs: Segment[]): string {
  let out = "$";
  for (const s of segs) {
    if (typeof s === "number") out += `[${s}]`;
    else if (IDENT_RE.test(s)) out += `.${s}`;
    else out += `["${s.replace(/"/g, '\\"')}"]`;
  }
  return out;
}

function isContainer(v: unknown): v is Record<string, unknown> | unknown[] {
  return typeof v === "object" && v !== null;
}

function valueAt(data: unknown, segs: Segment[]): unknown {
  let cur: unknown = data;
  for (const s of segs) {
    if (!isContainer(cur)) return undefined;
    cur = Array.isArray(cur) ? cur[s as number] : (cur as Record<string, unknown>)[s as string];
  }
  return cur;
}

function typeLabel(v: unknown): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (Array.isArray(v)) return `array · ${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") {
    const n = Object.keys(v as object).length;
    return `object · ${n} key${n === 1 ? "" : "s"}`;
  }
  return typeof v;
}

function previewOf(v: unknown): string {
  if (v === undefined) return "—";
  const text = JSON.stringify(v, null, 2) ?? "undefined";
  const lines = text.split("\n");
  return lines.length > 10 ? `${lines.slice(0, 10).join("\n")}\n…` : text;
}

function primitiveClass(v: unknown): string {
  if (typeof v === "string") return "text-emerald-400";
  if (typeof v === "number") return "text-amber-400";
  if (typeof v === "boolean") return "text-purple-400";
  return "text-muted-foreground";
}

function primitiveText(v: unknown): string {
  return typeof v === "string" ? `"${v}"` : String(v);
}

interface TreeNodeProps {
  value: unknown;
  segs: Segment[];
  label: string;
  depth: number;
  expanded: Set<string>;
  selectedKey: string;
  onToggle: (k: string) => void;
  onPick: (segs: Segment[]) => void;
}

function TreeNode({
  value,
  segs,
  label,
  depth,
  expanded,
  selectedKey,
  onToggle,
  onPick,
}: TreeNodeProps) {
  const k = keyOf(segs);
  const isSel = selectedKey === k;
  const container = isContainer(value);
  const isOpen = container && expanded.has(k);
  const entries: [Segment, unknown][] = container
    ? Array.isArray(value)
      ? value.map((v, i) => [i, v] as [Segment, unknown])
      : Object.entries(value).map(([key, v]) => [key, v] as [Segment, unknown])
    : [];
  const summary = container
    ? Array.isArray(value)
      ? `[…] ${value.length} item${value.length === 1 ? "" : "s"}`
      : `{…} ${Object.keys(value).length} key${Object.keys(value).length === 1 ? "" : "s"}`
    : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-sm py-0.5 pr-2",
          isSel && "bg-muted ring-1 ring-foreground/30 ring-inset",
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {container ? (
          <button
            aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
            className="shrink-0 rounded text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(k)}
            type="button"
          >
            {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => onPick(segs)}
          type="button"
        >
          <span className="shrink-0 text-blue-400">{label}</span>
          {container ? (
            isOpen ? null : (
              <span className="truncate text-[10px] text-muted-foreground">{summary}</span>
            )
          ) : (
            <span className={cn("truncate", primitiveClass(value))}>{primitiveText(value)}</span>
          )}
        </button>
      </div>
      {container && isOpen
        ? entries.map(([seg, child]) => (
            <TreeNode
              depth={depth + 1}
              expanded={expanded}
              key={String(seg)}
              label={typeof seg === "number" ? `[${seg}]` : seg}
              onPick={onPick}
              onToggle={onToggle}
              segs={[...segs, seg]}
              selectedKey={selectedKey}
              value={child}
            />
          ))
        : null}
    </div>
  );
}

export function JsonPathPicker({ data, onSelect, className }: JsonPathPickerProps) {
  const [selected, setSelected] = useState<Segment[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([keyOf([])]));
  const [copied, setCopied] = useState(false);

  const pick = (segs: Segment[]) => {
    setSelected(segs);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (let i = 0; i <= segs.length; i++) {
        next.add(keyOf(segs.slice(0, i)));
      }
      return next;
    });
    onSelect?.(formatPath(segs));
  };

  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const copy = () => {
    navigator.clipboard?.writeText(formatPath(selected));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const value = valueAt(data, selected);
  const path = formatPath(selected);
  const crumbs: { label: string; segs: Segment[] }[] = [{ label: "$", segs: [] }];
  selected.forEach((s, i) => {
    crumbs.push({
      label: typeof s === "number" ? `[${s}]` : String(s),
      segs: selected.slice(0, i + 1),
    });
  });

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="max-h-64 overflow-auto p-2 font-mono">
        <TreeNode
          depth={0}
          expanded={expanded}
          label="$"
          onPick={pick}
          onToggle={toggle}
          segs={[]}
          selectedKey={keyOf(selected)}
          value={data}
        />
      </div>

      <div className="space-y-2 border-border border-t px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-0.5 font-sans text-[11px]">
          {crumbs.map((c, i) => (
            <span className="flex items-center gap-0.5" key={keyOf(c.segs)}>
              {i > 0 ? <span className="text-muted-foreground">›</span> : null}
              <button
                className={cn(
                  "rounded px-1 py-0.5 font-mono transition-colors",
                  i === crumbs.length - 1
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => pick(c.segs)}
                type="button"
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">{path}</code>
          <button
            className="flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={copy}
            type="button"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {typeLabel(value)}
          </span>
          <pre className="max-h-40 overflow-auto whitespace-pre rounded bg-muted/30 p-2 font-mono text-[11px] leading-5">
            {previewOf(value)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default JsonPathPicker;
