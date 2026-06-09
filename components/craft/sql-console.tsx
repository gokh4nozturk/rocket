"use client";

import { CheckCircle2, History, Loader2, Play, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount?: number;
  durationMs?: number;
  error?: string;
}

export interface SqlConsoleProps {
  initialQuery?: string;
  onRun: (sql: string) => QueryResult | Promise<QueryResult>;
  className?: string;
}

type RunStatus = "idle" | "running" | "success" | "error";

interface HistoryEntry {
  id: number;
  sql: string;
  status: "success" | "error";
  durationMs: number;
  rowCount: number;
}

interface Token {
  type: "comment" | "string" | "number" | "keyword" | "punct" | "text";
  text: string;
}

const SQL_KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "and",
  "or",
  "not",
  "null",
  "is",
  "in",
  "like",
  "between",
  "join",
  "inner",
  "left",
  "right",
  "outer",
  "full",
  "cross",
  "on",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "offset",
  "as",
  "distinct",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "create",
  "table",
  "drop",
  "alter",
  "asc",
  "desc",
  "union",
  "all",
  "case",
  "when",
  "then",
  "else",
  "end",
  "true",
  "false",
  "with",
]);

const TOKEN_CLASS: Record<Token["type"], string> = {
  comment: "text-muted-foreground italic",
  keyword: "text-blue-400",
  number: "text-amber-400",
  punct: "text-foreground",
  string: "text-emerald-400",
  text: "text-foreground",
};

function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\s])/g;
  for (const m of sql.matchAll(re)) {
    if (m[1] !== undefined) tokens.push({ text: m[1], type: "comment" });
    else if (m[2] !== undefined) tokens.push({ text: m[2], type: "string" });
    else if (m[3] !== undefined) tokens.push({ text: m[3], type: "number" });
    else if (m[4] !== undefined)
      tokens.push({ text: m[4], type: SQL_KEYWORDS.has(m[4].toLowerCase()) ? "keyword" : "text" });
    else if (m[5] !== undefined) tokens.push({ text: m[5], type: "text" });
    else tokens.push({ text: m[0], type: "punct" });
  }
  return tokens;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function SqlConsole({ initialQuery = "", onRun, className }: SqlConsoleProps) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [rowCount, setRowCount] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const preRef = useRef<HTMLPreElement | null>(null);
  const idRef = useRef(0);

  const pushHistory = (st: "success" | "error", dur: number, count: number) => {
    idRef.current += 1;
    const entry: HistoryEntry = {
      durationMs: dur,
      id: idRef.current,
      rowCount: count,
      sql: query,
      status: st,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 8));
  };

  const run = async () => {
    if (status === "running" || !query.trim()) return;
    setStatus("running");
    setError(null);
    const t0 = performance.now();
    try {
      const res = await onRun(query);
      const dur = res.durationMs ?? Math.round(performance.now() - t0);
      if (res.error) {
        setError(res.error);
        setResult(null);
        setStatus("error");
        pushHistory("error", dur, 0);
      } else {
        const count = res.rowCount ?? res.rows.length;
        setResult(res);
        setDurationMs(dur);
        setRowCount(count);
        setStatus("success");
        pushHistory("success", dur, count);
      }
    } catch (e) {
      const dur = Math.round(performance.now() - t0);
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
      setStatus("error");
      pushHistory("error", dur, 0);
    }
  };

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const pre = preRef.current;
    if (pre) {
      pre.scrollTop = e.currentTarget.scrollTop;
      pre.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={status === "running" || !query.trim()}
          onClick={run}
          type="button"
        >
          {status === "running" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          Run
          <kbd className="ml-1 rounded bg-primary-foreground/20 px-1 py-px text-[9px]">⌘↵</kbd>
        </button>
        <span className="text-[11px] text-muted-foreground">
          {status === "running" ? (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" /> Running…
            </span>
          ) : status === "success" ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="size-3.5" /> Done
            </span>
          ) : status === "error" ? (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="size-3.5" /> Error
            </span>
          ) : null}
        </span>
      </div>

      <div className="relative h-40 overflow-hidden border-border border-y bg-muted/20 font-mono text-xs leading-5">
        <pre
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words p-3"
          ref={preRef}
        >
          {tokenizeSql(query).map((t, i) => (
            <span className={TOKEN_CLASS[t.type]} key={i}>
              {t.text}
            </span>
          ))}
          {"\n"}
        </pre>
        <textarea
          className="absolute inset-0 m-0 resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 text-transparent caret-foreground outline-none"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          value={query}
        />
      </div>

      {status === "idle" ? (
        <div className="p-6 text-center text-muted-foreground text-xs">
          Run a query to see results
        </div>
      ) : status === "running" ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground text-xs">
          <Loader2 className="size-3.5 animate-spin" /> Running…
        </div>
      ) : status === "error" ? (
        <div className="m-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 font-mono text-[11px] text-red-500">
          {error}
        </div>
      ) : result ? (
        <>
          <div className="flex items-center gap-1.5 border-border border-b px-3 py-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            {rowCount} row{rowCount === 1 ? "" : "s"} · {formatDuration(durationMs)}
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-border border-b">
                  {result.columns.map((c) => (
                    <th
                      className="whitespace-nowrap px-3 py-1.5 font-medium font-mono text-muted-foreground"
                      key={c}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 50).map((row, ri) => (
                  <tr className="border-border/50 border-b" key={ri}>
                    {result.columns.map((c, ci) => (
                      <td className="whitespace-nowrap px-3 py-1 font-mono" key={c}>
                        {row[ci] === null || row[ci] === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          formatCell(row[ci])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length > 50 ? (
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground italic">
                +{result.rows.length - 50} more rows
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {history.length > 0 ? (
        <div className="border-border border-t">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <History className="size-3" /> Recent
          </div>
          <div className="divide-y divide-border/50">
            {history.map((h) => (
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/40"
                key={h.id}
                onClick={() => setQuery(h.sql)}
                type="button"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: h.status === "success" ? "#10b981" : "#ef4444" }}
                />
                <span className="flex-1 truncate font-mono text-[11px]">
                  {h.sql.replace(/\s+/g, " ").trim()}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {h.status === "success" ? `${h.rowCount} rows · ` : ""}
                  {formatDuration(h.durationMs)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SqlConsole;
