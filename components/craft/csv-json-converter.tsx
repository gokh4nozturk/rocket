"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type CsvDir = "csv" | "json";

export type CsvResult =
  | { cols: number; ok: true; output: string; rows: number }
  | { error: string; ok: false };

export interface CsvJsonConverterProps {
  className?: string;
  defaultDelimiter?: string;
  defaultDir?: CsvDir;
  defaultValue?: string;
}

interface Cell {
  q: boolean;
  v: string;
}

const COLOR_ERROR = "#ef4444";
const NUM_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

const DELIMS: { label: string; value: string }[] = [
  { label: "comma", value: "," },
  { label: "tab", value: "\t" },
  { label: "semicolon", value: ";" },
];

const DIRS: { from: string; to: string; value: CsvDir }[] = [
  { from: "csv", to: "json", value: "csv" },
  { from: "json", to: "csv", value: "json" },
];

export const CSV_SAMPLE = `id,name,active,score,note
1,Ada,true,4.5,"hello, world"
2,Linus,false,9,
3,Grace,true,,"quote ""x"""`;

export function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  let best = ",";
  let bestN = -1;
  for (const d of [",", "\t", ";"]) {
    const n = firstLine.split(d).length - 1;
    if (n > bestN) {
      bestN = n;
      best = d;
    }
  }
  return best;
}

function parseRows(text: string, delim: string): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let v = "";
  let everQ = false;
  let inQ = false;
  const n = text.length;
  let i = 0;
  const pushField = () => {
    row.push({ q: everQ, v });
    v = "";
    everQ = false;
  };
  while (i < n) {
    const c = text.charAt(i);
    if (inQ) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') {
          v += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      v += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      everQ = true;
      i++;
      continue;
    }
    if (c === delim) {
      pushField();
      i++;
      continue;
    }
    if (c === "\n") {
      pushField();
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    v += c;
    i++;
  }
  pushField();
  rows.push(row);
  const lastRow = rows[rows.length - 1];
  if (rows.length > 1 && lastRow?.length === 1 && lastRow[0]?.q === false && lastRow[0]?.v === "") {
    rows.pop();
  }
  return rows;
}

function inferCell(cell: Cell): unknown {
  if (cell.q) return cell.v;
  const s = cell.v;
  if (s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (NUM_RE.test(s)) return Number(s);
  return s;
}

export function csvToJson(text: string, delim: string): Record<string, unknown>[] {
  const rows = parseRows(text, delim);
  const headerRow = rows[0];
  if (rows.length === 0 || headerRow === undefined) return [];
  const header = headerRow.map((c) => c.v);
  const out: Record<string, unknown>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    const obj: Record<string, unknown> = {};
    header.forEach((h, j) => {
      const cell = cells[j];
      obj[h] = cell === undefined ? null : inferCell(cell);
    });
    out.push(obj);
  }
  return out;
}

function needsQuote(s: string, delim: string): boolean {
  if (s === "") return true;
  if (s.includes(delim) || s.includes('"') || s.includes("\n") || s.includes("\r")) return true;
  if (s === "true" || s === "false") return true;
  return NUM_RE.test(s);
}

function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function serializeCell(val: unknown, delim: string): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return needsQuote(val, delim) ? quote(val) : val;
  return quote(JSON.stringify(val));
}

export function jsonToCsv(arr: Record<string, unknown>[], delim: string): string {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const o of arr) {
    for (const k of Object.keys(o)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  const lines = [keys.map((k) => (needsQuote(k, delim) ? quote(k) : k)).join(delim)];
  for (const o of arr) {
    lines.push(keys.map((k) => serializeCell(o[k], delim)).join(delim));
  }
  return lines.join("\n");
}

export function convert(value: string, dir: CsvDir, delim: string): CsvResult {
  if (dir === "csv") {
    const data = csvToJson(value, delim);
    const rows = parseRows(value, delim);
    const cols = rows[0]?.length ?? 0;
    return { cols, ok: true, output: JSON.stringify(data, null, 2), rows: data.length };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { error: "invalid JSON", ok: false };
  }
  if (!Array.isArray(parsed)) {
    return { error: "expected an array of objects", ok: false };
  }
  for (const el of parsed) {
    if (typeof el !== "object" || el === null || Array.isArray(el)) {
      return { error: "expected an array of objects", ok: false };
    }
  }
  const arr = parsed as Record<string, unknown>[];
  const output = jsonToCsv(arr, delim);
  const cols = output === "" ? 0 : (output.split("\n")[0] ?? "").split(delim).length;
  return { cols, ok: true, output, rows: arr.length };
}

export function CsvJsonConverter({
  className,
  defaultDelimiter = ",",
  defaultDir = "csv",
  defaultValue = CSV_SAMPLE,
}: CsvJsonConverterProps) {
  const [value, setValue] = useState(defaultValue);
  const [dir, setDir] = useState<CsvDir>(defaultDir);
  const [delim, setDelim] = useState(defaultDelimiter);
  const [delimTouched, setDelimTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  const trimmed = value.trim();
  const result = trimmed === "" ? null : convert(value, dir, delim);
  const outLabel = dir === "csv" ? "JSON" : "CSV";

  function switchTo(next: CsvDir) {
    if (next === dir) return;
    const conv = convert(value, dir, delim);
    if (conv.ok) setValue(conv.output);
    setDir(next);
  }

  function changeDelim(d: string) {
    setDelim(d);
    setDelimTouched(true);
  }

  function onText(v: string) {
    setValue(v);
    if (dir === "csv" && !delimTouched) setDelim(detectDelimiter(v));
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
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
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">delim</span>
            {DELIMS.map((d) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  d.value === delim
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                key={d.value}
                onClick={() => {
                  changeDelim(d.value);
                }}
                type="button"
              >
                {d.label}
              </button>
            ))}
          </span>
        </div>
        <textarea
          aria-label="Input"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            onText(e.target.value);
          }}
          rows={6}
          spellCheck={false}
          value={value}
        />
      </div>
      <div className="flex flex-col gap-2 p-3">
        {result === null ? (
          <p className="text-muted-foreground">Paste {dir === "csv" ? "CSV" : "a JSON array"}</p>
        ) : !result.ok ? (
          <p style={{ color: COLOR_ERROR }}>{result.error}</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                {outLabel} · {result.rows} row{result.rows === 1 ? "" : "s"} × {result.cols} col
                {result.cols === 1 ? "" : "s"}
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
            <p className="text-[10px] text-muted-foreground">
              quoted cells stay strings; bare true/false/numbers are typed, empty → null
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default CsvJsonConverter;
