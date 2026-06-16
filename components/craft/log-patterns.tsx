"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PatternGroup {
  count: number;
  example: string;
  pct: number;
  template: string;
}

export interface ExtractResult {
  groups: PatternGroup[];
  patterns: number;
  total: number;
}

export interface LogPatternsProps {
  className?: string;
  defaultMinCount?: number;
  defaultValue?: string;
}

const COLOR_MASK = "#f59e0b";

const ISO_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
const TIME = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const IP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DUR = /^\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h)$/;
const NUM = /^-?\d+(?:\.\d+)?$/;
const HEX = /^(?:0x)?[0-9a-fA-F]{6,}$/;
const PLACEHOLDER_SPLIT = /(<[a-z]+>)/g;
const IS_PLACEHOLDER = /^<[a-z]+>$/;

export const PATTERNS_SAMPLE = `2026-06-15T08:01:13Z ERROR payments timeout after 3000ms user=cus_12af
2026-06-15T08:01:14Z INFO api request completed in 142ms
2026-06-15T08:02:02Z ERROR payments timeout after 5000ms user=cus_98zz
2026-06-15T08:03:11Z WARN api slow response 920ms
2026-06-15T08:03:15Z INFO api request completed in 88ms
2026-06-15T08:04:01Z INFO api request completed in 210ms
2026-06-15T08:04:09Z ERROR db connection refused 10.0.12.5`;

function classify(tok: string): string | null {
  if (ISO_DT.test(tok) || TIME.test(tok)) return "<ts>";
  if (IP.test(tok)) return "<ip>";
  if (UUID.test(tok)) return "<uuid>";
  if (DUR.test(tok)) return "<dur>";
  if (NUM.test(tok)) return "<num>";
  if (HEX.test(tok) && /[a-fA-F]/.test(tok)) return "<hex>";
  if (/[A-Za-z]/.test(tok) && /\d/.test(tok) && tok.length > 3) return "<id>";
  return null;
}

function maskToken(tok: string): string {
  const eq = tok.indexOf("=");
  if (eq > 0) {
    const k = tok.slice(0, eq);
    const v = tok.slice(eq + 1);
    return `${k}=${classify(v) ?? v}`;
  }
  return classify(tok) ?? tok;
}

export function templatize(line: string): string {
  return line
    .split(/(\s+)/)
    .map((p) => (/^\s+$/.test(p) ? p : maskToken(p)))
    .join("");
}

export function extractPatterns(text: string, minCount: number): ExtractResult {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const map = new Map<string, PatternGroup>();
  for (const line of lines) {
    const t = templatize(line);
    const existing = map.get(t);
    if (existing) {
      existing.count++;
    } else {
      map.set(t, { count: 1, example: line, pct: 0, template: t });
    }
  }
  const total = lines.length;
  const groups = [...map.values()]
    .sort((a, b) => b.count - a.count)
    .filter((g) => g.count >= minCount);
  for (const g of groups) {
    g.pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
  }
  return { groups, patterns: map.size, total };
}

function ColoredTemplate({ template }: { template: string }) {
  const parts = template.split(PLACEHOLDER_SPLIT);
  return (
    <>
      {parts.map((part, i) =>
        IS_PLACEHOLDER.test(part) ? (
          <span key={i} style={{ color: COLOR_MASK }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function LogPatterns({
  className,
  defaultMinCount = 1,
  defaultValue = PATTERNS_SAMPLE,
}: LogPatternsProps) {
  const [value, setValue] = useState(defaultValue);
  const [minCount, setMinCount] = useState(String(defaultMinCount));

  const parsedMin = Number.parseInt(minCount, 10);
  const min = Number.isNaN(parsedMin) || parsedMin < 1 ? 1 : parsedMin;
  const trimmed = value.trim();
  const result = trimmed === "" ? null : extractPatterns(value, min);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <textarea
          aria-label="Log lines"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="paste log lines"
          rows={7}
          spellCheck={false}
          value={value}
        />
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            min count
          </span>
          <input
            aria-label="Minimum count"
            className="h-7 w-16 rounded-md border border-border bg-transparent px-2 text-right font-mono text-xs outline-none focus:border-ring"
            onChange={(e) => {
              setMinCount(e.target.value);
            }}
            spellCheck={false}
            type="text"
            value={minCount}
          />
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {result === null ? (
          <p className="text-muted-foreground">Paste log lines to cluster</p>
        ) : (
          <>
            <p className="font-mono">
              <span className="font-medium">{result.total}</span>{" "}
              <span className="text-muted-foreground">line{result.total === 1 ? "" : "s"} →</span>{" "}
              <span className="font-medium">{result.patterns}</span>{" "}
              <span className="text-muted-foreground">
                pattern{result.patterns === 1 ? "" : "s"}
              </span>
            </p>
            <div className="flex flex-col divide-y divide-border">
              {result.groups.length === 0 ? (
                <p className="text-muted-foreground">no patterns ≥ {min}</p>
              ) : (
                result.groups.map((g) => (
                  <div className="flex flex-col gap-1 py-2 first:pt-0" key={g.template}>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="shrink-0 font-medium font-mono"
                        style={{ color: COLOR_MASK }}
                      >
                        ×{g.count}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {g.pct}%
                      </span>
                      <span className="break-all font-mono">
                        <ColoredTemplate template={g.template} />
                      </span>
                    </div>
                    <span className="truncate pl-8 font-mono text-[10px] text-muted-foreground">
                      {g.example}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LogPatterns;
