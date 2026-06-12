"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RegexTesterProps {
  initialPattern?: string;
  initialFlags?: string;
  initialSample?: string;
  className?: string;
}

type Flag = "i" | "g";

interface Span {
  start: number;
  end: number;
}

interface LineResult {
  line: string;
  spans: Span[];
  first: RegExpMatchArray | null;
}

interface GroupRow {
  label: string;
  value: string | undefined;
}

function compile(pattern: string, flagStr: string): { re: RegExp } | { error: string } | null {
  if (pattern === "") return null;
  try {
    return { re: new RegExp(pattern, flagStr) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function testLine(line: string, reG: RegExp, globalMode: boolean): LineResult {
  const all = [...line.matchAll(reG)];
  const considered = globalMode ? all : all.slice(0, 1);
  const spans: Span[] = [];
  for (const m of considered) {
    const text = m[0] ?? "";
    if (text.length === 0) continue;
    const start = m.index ?? 0;
    spans.push({ end: start + text.length, start });
  }
  return { first: all[0] ?? null, line, spans };
}

function groupRows(m: RegExpMatchArray): GroupRow[] {
  const rows: GroupRow[] = [{ label: "#0", value: m[0] }];
  for (let i = 1; i < m.length; i++) {
    rows.push({ label: `#${i}`, value: m[i] });
  }
  if (m.groups) {
    for (const [name, value] of Object.entries(m.groups)) {
      rows.push({ label: name, value });
    }
  }
  return rows;
}

function Highlighted({ line, spans }: { line: string; spans: Span[] }) {
  if (spans.length === 0) return <>{line}</>;
  const parts: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start > pos) {
      parts.push(line.slice(pos, s.start));
    }
    parts.push(
      <span className="rounded-sm bg-amber-500/30" key={i}>
        {line.slice(s.start, s.end)}
      </span>,
    );
    pos = s.end;
  });
  if (pos < line.length) {
    parts.push(line.slice(pos));
  }
  return <>{parts}</>;
}

export function RegexTester({
  initialPattern = "",
  initialFlags = "",
  initialSample = "",
  className,
}: RegexTesterProps) {
  const [pattern, setPattern] = useState(initialPattern);
  const [flags, setFlags] = useState<Set<Flag>>(
    () => new Set((["i", "g"] as Flag[]).filter((f) => initialFlags.includes(f))),
  );
  const [sample, setSample] = useState(initialSample);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const flagStr = (["i", "g"] as Flag[]).filter((f) => flags.has(f)).join("");
  const compiled = compile(pattern, flagStr);
  const lines = sample.split("\n");

  let results: LineResult[] | null = null;
  if (compiled && "re" in compiled) {
    const reG = new RegExp(pattern, flagStr.includes("g") ? flagStr : `${flagStr}g`);
    results = lines.map((line) => testLine(line, reG, flags.has("g")));
  }

  const matchCount = results ? results.filter((r) => r.first !== null).length : 0;
  const firstMatching = results ? results.findIndex((r) => r.first !== null) : -1;
  const sel =
    selectedLine !== null && selectedLine < lines.length
      ? selectedLine
      : firstMatching !== -1
        ? firstMatching
        : null;
  const selResult = sel !== null && results ? results[sel] : null;

  const toggleFlag = (f: Flag) =>
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="space-y-1.5 border-border border-b px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-muted-foreground">/</span>
          <input
            aria-label="Pattern"
            className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
            onChange={(e) => setPattern(e.target.value)}
            placeholder="pattern"
            spellCheck={false}
            value={pattern}
          />
          <span className="font-mono text-muted-foreground">/</span>
          {(["i", "g"] as Flag[]).map((f) => (
            <button
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                flags.has(f)
                  ? "border-foreground/30 bg-muted font-medium text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              key={f}
              onClick={() => toggleFlag(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
        {compiled && "error" in compiled ? (
          <p className="font-mono text-[11px] text-red-500">{compiled.error}</p>
        ) : null}
      </div>

      <div className="border-border border-b p-2">
        <textarea
          aria-label="Sample text"
          className="h-24 w-full resize-y rounded-md border border-border bg-background p-2 font-mono text-xs leading-5 outline-none focus:border-foreground/30"
          onChange={(e) => setSample(e.target.value)}
          spellCheck={false}
          value={sample}
        />
      </div>

      <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
        {compiled === null
          ? "Enter a pattern"
          : "error" in compiled
            ? "Fix the pattern to see matches"
            : `${matchCount} of ${lines.length} lines match`}
      </div>

      <div className="max-h-48 divide-y divide-border/60 overflow-auto border-border border-t font-mono">
        {lines.map((line, i) => {
          const r = results?.[i] ?? null;
          const matched = r?.first != null;
          const isSel = sel === i && results !== null;
          return (
            <button
              className={cn(
                "flex w-full items-start gap-1.5 px-3 py-1 text-left",
                results !== null && "hover:bg-muted/40",
                isSel && "bg-muted/60 ring-1 ring-foreground/30 ring-inset",
              )}
              disabled={results === null}
              key={i}
              onClick={() => setSelectedLine(i)}
              type="button"
            >
              {results !== null ? (
                matched ? (
                  <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                ) : (
                  <X className="mt-0.5 size-3 shrink-0 text-muted-foreground/50" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}
              <span className="whitespace-pre-wrap break-all">
                {r ? <Highlighted line={line} spans={r.spans} /> : line}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1 border-border border-t px-3 py-2.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {sel !== null ? `Capture groups · line ${sel + 1}` : "Capture groups"}
        </span>
        {selResult?.first ? (
          <div className="divide-y divide-border/50">
            {groupRows(selResult.first).map((g) => (
              <div className="flex gap-3 py-1 font-mono" key={g.label}>
                <span className="w-20 shrink-0 truncate text-muted-foreground">{g.label}</span>
                {g.value === undefined ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className="min-w-0 flex-1 break-all">{g.value}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            {selResult ? "no match on this line" : "—"}
          </p>
        )}
      </div>
    </div>
  );
}

export default RegexTester;
