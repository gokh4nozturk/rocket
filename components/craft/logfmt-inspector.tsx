"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ValType = "boolean" | "duration" | "null" | "number" | "string";

export type Dir = "json" | "logfmt";

export interface Pair {
  display: string;
  json: unknown;
  key: string;
  type: ValType;
}

export type ParseResult =
  | { ok: true; output: string; pairs: Pair[] }
  | { error: string; ok: false };

export interface LogfmtInspectorProps {
  className?: string;
  defaultDir?: Dir;
  defaultValue?: string;
}

const COLOR_ERROR = "#ef4444";
const COLOR_KEY = "#38bdf8";

const TYPE_COLOR: Record<ValType, string> = {
  boolean: "#f59e0b",
  duration: "#ec4899",
  null: "#94a3b8",
  number: "#a855f7",
  string: "#10b981",
};

const NUM_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DUR_RE = /^-?(?:\d+(?:\.\d+)?)(?:ns|us|µs|ms|s|m|h|d)$/;

export const LOGFMT_SAMPLE =
  'level=error msg="payment timeout" dur=3000ms user=cus_12af ok=false retries=3 trace=null';

function classifyBare(raw: string): { json: unknown; type: ValType } {
  if (raw === "true") return { json: true, type: "boolean" };
  if (raw === "false") return { json: false, type: "boolean" };
  if (raw === "null") return { json: null, type: "null" };
  if (NUM_RE.test(raw)) return { json: Number(raw), type: "number" };
  if (DUR_RE.test(raw)) return { json: raw, type: "duration" };
  return { json: raw, type: "string" };
}

export function parseLogfmt(line: string): Pair[] {
  const pairs: Pair[] = [];
  const n = line.length;
  let i = 0;
  while (i < n) {
    while (i < n && line.charAt(i) === " ") {
      i++;
    }
    if (i >= n) break;
    let key = "";
    while (i < n) {
      const c = line.charAt(i);
      if (c === "=" || c === " ") break;
      key += c;
      i++;
    }
    if (line.charAt(i) === "=") {
      i++;
      let raw = "";
      let quoted = false;
      if (line.charAt(i) === '"') {
        quoted = true;
        i++;
        while (i < n && line.charAt(i) !== '"') {
          const c = line.charAt(i);
          if (c === "\\" && i + 1 < n) {
            const nx = line.charAt(i + 1);
            if (nx === '"' || nx === "\\") {
              raw += nx;
              i += 2;
              continue;
            }
            if (nx === "n") {
              raw += "\n";
              i += 2;
              continue;
            }
            if (nx === "t") {
              raw += "\t";
              i += 2;
              continue;
            }
          }
          raw += c;
          i++;
        }
        i++;
      } else {
        while (i < n) {
          const c = line.charAt(i);
          if (c === " ") break;
          raw += c;
          i++;
        }
      }
      if (key !== "") {
        const cls = quoted ? { json: raw, type: "string" as ValType } : classifyBare(raw);
        pairs.push({ display: raw, json: cls.json, key, type: cls.type });
      }
    } else if (key !== "") {
      pairs.push({ display: "true", json: true, key, type: "boolean" });
    }
  }
  return pairs;
}

function pairFromJson(key: string, v: unknown): Pair {
  if (v === null) return { display: "null", json: null, key, type: "null" };
  if (typeof v === "boolean") return { display: String(v), json: v, key, type: "boolean" };
  if (typeof v === "number") return { display: String(v), json: v, key, type: "number" };
  if (typeof v === "string") {
    return { display: v, json: v, key, type: DUR_RE.test(v) ? "duration" : "string" };
  }
  const s = JSON.stringify(v);
  return { display: s, json: v, key, type: "string" };
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function needsQuote(s: string): boolean {
  if (s === "") return true;
  if (/[\s="]/.test(s)) return true;
  if (s === "true" || s === "false" || s === "null") return true;
  return NUM_RE.test(s) || DUR_RE.test(s);
}

function valueText(p: Pair): string {
  if (p.type === "null") return "null";
  if (p.type === "boolean") return p.json === true ? "true" : "false";
  if (p.type === "number") return String(p.json);
  const s = typeof p.json === "string" ? p.json : JSON.stringify(p.json);
  return needsQuote(s) ? quote(s) : s;
}

function toLogfmt(pairs: Pair[]): string {
  return pairs.map((p) => `${p.key}=${valueText(p)}`).join(" ");
}

function toJsonString(pairs: Pair[]): string {
  const obj: Record<string, unknown> = {};
  for (const p of pairs) {
    obj[p.key] = p.json;
  }
  return JSON.stringify(obj, null, 2);
}

export function convert(value: string, dir: Dir): ParseResult {
  if (dir === "logfmt") {
    const pairs = parseLogfmt(value);
    return { ok: true, output: toJsonString(pairs), pairs };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { error: "invalid JSON", ok: false };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { error: "expected a JSON object", ok: false };
  }
  const pairs: Pair[] = [];
  for (const [key, v] of Object.entries(parsed as Record<string, unknown>)) {
    pairs.push(pairFromJson(key, v));
  }
  return { ok: true, output: toLogfmt(pairs), pairs };
}

const DIRS: { from: string; to: string; value: Dir }[] = [
  { from: "logfmt", to: "json", value: "logfmt" },
  { from: "json", to: "logfmt", value: "json" },
];

export function LogfmtInspector({
  className,
  defaultDir = "logfmt",
  defaultValue = LOGFMT_SAMPLE,
}: LogfmtInspectorProps) {
  const [dir, setDir] = useState<Dir>(defaultDir);
  const [value, setValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);

  const trimmed = value.trim();
  const result = trimmed === "" ? null : convert(value, dir);
  const outLabel = dir === "logfmt" ? "JSON" : "logfmt";

  function switchTo(next: Dir) {
    if (next === dir) return;
    const conv = convert(value, dir);
    if (conv.ok) setValue(conv.output);
    setDir(next);
  }

  function copyOutput(output: string) {
    void navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <div className="flex items-center gap-1.5">
          {DIRS.map((d) => (
            <button
              className={cn(
                "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                d.value === dir
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={d.value}
              onClick={() => {
                switchTo(d.value);
              }}
              type="button"
            >
              {d.from} → {d.to}
            </button>
          ))}
        </div>
        <textarea
          aria-label="Input"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder={dir === "logfmt" ? 'level=error msg="..."' : '{ "level": "error" }'}
          rows={2}
          spellCheck={false}
          value={value}
        />
        <div className="flex items-center gap-1.5">
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setDir("logfmt");
              setValue(LOGFMT_SAMPLE);
            }}
            type="button"
          >
            load sample
          </button>
        </div>
      </div>
      <div className="p-3">
        {result === null ? (
          <p className="text-muted-foreground">Paste a {dir} line or load the sample</p>
        ) : !result.ok ? (
          <p style={{ color: COLOR_ERROR }}>{result.error}</p>
        ) : result.pairs.length === 0 ? (
          <p className="text-muted-foreground">no key=value pairs found</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="break-all font-mono leading-relaxed">
              {result.pairs.map((p, idx) => (
                <span key={`${p.key}-${idx}`}>
                  {idx > 0 && " "}
                  <span style={{ color: COLOR_KEY }}>{p.key}</span>
                  <span className="text-muted-foreground">=</span>
                  <span style={{ color: TYPE_COLOR[p.type] }}>{valueText(p)}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-[8rem_5rem_1fr] gap-x-2 gap-y-1.5">
              {result.pairs.map((p, idx) => (
                <div className="contents" key={`${p.key}-${idx}`}>
                  <span className="truncate font-mono" style={{ color: COLOR_KEY }}>
                    {p.key}
                  </span>
                  <span
                    className="justify-self-start rounded px-1 py-0.5 font-medium font-mono text-[10px]"
                    style={{
                      backgroundColor: `${TYPE_COLOR[p.type]}1f`,
                      color: TYPE_COLOR[p.type],
                    }}
                  >
                    {p.type}
                  </span>
                  <span className="break-all font-mono" style={{ color: TYPE_COLOR[p.type] }}>
                    {p.type === "null" ? <span className="italic">null</span> : valueText(p)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 border-border border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {outLabel}
                </span>
                <button
                  className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    copyOutput(result.output);
                  }}
                  type="button"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto whitespace-pre rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">
                {result.output}
              </pre>
            </div>
            <p className="text-[10px] text-muted-foreground">
              quoted values stay strings; bare true/false/null/numbers are typed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogfmtInspector;
