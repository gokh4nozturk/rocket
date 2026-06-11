"use client";

import { ArrowRight, Wand2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MapperField {
  name: string;
  type: string;
  required?: boolean;
}

export interface FieldMapping {
  target: string;
  source: string | null;
  transform: string | null;
}

export interface FieldMapperProps {
  sourceFields: MapperField[];
  targetFields: MapperField[];
  defaultMapping?: Record<string, string>;
  onChange?: (mapping: FieldMapping[]) => void;
  className?: string;
}

interface Entry {
  source: string | null;
  transform: string | null;
}

const TRANSFORMS = ["cast", "trim", "lowercase", "uppercase"];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMatch(target: string, sourceFields: MapperField[]): string | null {
  const t = normalize(target);
  for (const s of sourceFields) {
    if (normalize(s.name) === t) return s.name;
  }
  for (const s of sourceFields) {
    const n = normalize(s.name);
    if (Math.min(n.length, t.length) >= 3 && (n.includes(t) || t.includes(n))) return s.name;
  }
  return null;
}

function isMismatch(
  sourceType: string | undefined,
  targetType: string,
  transform: string | null,
): boolean {
  return sourceType !== undefined && sourceType !== targetType && transform !== "cast";
}

function seed(
  defaultMapping: Record<string, string> | undefined,
  targetFields: MapperField[],
): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const t of targetFields) {
    m.set(t.name, { source: defaultMapping?.[t.name] ?? null, transform: null });
  }
  return m;
}

export function FieldMapper({
  sourceFields,
  targetFields,
  defaultMapping,
  onChange,
  className,
}: FieldMapperProps) {
  const [mapping, setMapping] = useState<Map<string, Entry>>(() =>
    seed(defaultMapping, targetFields),
  );

  const entryOf = (name: string): Entry => mapping.get(name) ?? { source: null, transform: null };

  const commit = (next: Map<string, Entry>) => {
    setMapping(next);
    onChange?.(
      targetFields.map((t) => {
        const e = next.get(t.name) ?? { source: null, transform: null };
        return { source: e.source, target: t.name, transform: e.transform };
      }),
    );
  };

  const setSource = (target: string, source: string | null) => {
    const next = new Map(mapping);
    const cur = entryOf(target);
    next.set(target, { source, transform: source === null ? null : cur.transform });
    commit(next);
  };

  const setTransform = (target: string, transform: string | null) => {
    const next = new Map(mapping);
    next.set(target, { ...entryOf(target), transform });
    commit(next);
  };

  const autoMap = () => {
    const next = new Map(mapping);
    for (const t of targetFields) {
      const cur = next.get(t.name) ?? { source: null, transform: null };
      if (cur.source !== null) continue;
      const match = autoMatch(t.name, sourceFields);
      if (match) next.set(t.name, { source: match, transform: null });
    }
    commit(next);
  };

  const clear = () => commit(seed(undefined, targetFields));

  if (targetFields.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No target fields
      </div>
    );
  }

  const sourceByName = new Map(sourceFields.map((s) => [s.name, s]));
  let mapped = 0;
  let requiredUnmapped = 0;
  for (const t of targetFields) {
    const e = entryOf(t.name);
    if (e.source !== null) mapped++;
    else if (t.required) requiredUnmapped++;
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="text-[11px]">
          <span className="font-medium">
            {mapped} / {targetFields.length} mapped
          </span>
          {requiredUnmapped > 0 ? (
            <span className="ml-1.5 text-red-500">· {requiredUnmapped} required unmapped</span>
          ) : null}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={autoMap}
            type="button"
          >
            <Wand2 className="size-3" />
            Auto-map
          </button>
          <button
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={clear}
            type="button"
          >
            <X className="size-3" />
            Clear
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {targetFields.map((t) => {
          const e = entryOf(t.name);
          const src = e.source !== null ? sourceByName.get(e.source) : undefined;
          const mismatch = isMismatch(src?.type, t.type, e.transform);
          const reqEmpty = Boolean(t.required) && e.source === null;
          return (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 border-l-2 px-3 py-2",
                reqEmpty ? "border-l-red-500/60" : "border-l-transparent",
              )}
              key={t.name}
            >
              <span className="flex w-44 shrink-0 items-baseline gap-1">
                <span className="truncate font-medium font-mono">{t.name}</span>
                {t.required ? <span className="text-red-500">*</span> : null}
                <span className="font-mono text-[10px] text-muted-foreground">{t.type}</span>
              </span>
              <ArrowRight
                className={cn(
                  "size-3.5 shrink-0",
                  e.source !== null ? "text-foreground" : "text-muted-foreground/40",
                )}
              />
              <select
                aria-label={`Source for ${t.name}`}
                className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
                onChange={(ev) =>
                  setSource(t.name, ev.target.value === "" ? null : ev.target.value)
                }
                value={e.source ?? ""}
              >
                <option value="">—</option>
                {sourceFields.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
              <select
                aria-label={`Transform for ${t.name}`}
                className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-foreground/30 disabled:opacity-40"
                disabled={e.source === null}
                onChange={(ev) =>
                  setTransform(t.name, ev.target.value === "" ? null : ev.target.value)
                }
                value={e.transform ?? ""}
              >
                <option value="">no transform</option>
                {TRANSFORMS.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
              {mismatch ? (
                <span className="rounded bg-amber-500/15 px-1 py-px font-medium text-[10px] text-amber-500">
                  type mismatch
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FieldMapper;
