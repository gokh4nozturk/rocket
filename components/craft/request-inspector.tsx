"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TimingPhases {
  blocked?: number;
  dns?: number;
  connect?: number;
  ssl?: number;
  wait?: number;
  download?: number;
}

export interface HttpRequest {
  method: string;
  url: string;
  status: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timing?: TimingPhases;
  size?: number;
}

export interface RequestInspectorProps {
  request: HttpRequest;
  className?: string;
}

type Tab = "headers" | "payload" | "timing" | "response";

interface JsonToken {
  type: "key" | "string" | "number" | "keyword" | "punct" | "text";
  text: string;
}

const PHASE_ORDER = ["blocked", "dns", "connect", "ssl", "wait", "download"] as const;

const PHASE_META: Record<(typeof PHASE_ORDER)[number], { color: string; label: string }> = {
  blocked: { color: "#9ca3af", label: "Blocked" },
  connect: { color: "#f59e0b", label: "Connecting" },
  dns: { color: "#8b5cf6", label: "DNS Lookup" },
  download: { color: "#10b981", label: "Content Download" },
  ssl: { color: "#ec4899", label: "SSL" },
  wait: { color: "#3b82f6", label: "Waiting (TTFB)" },
};

const METHOD_COLOR: Record<string, string> = {
  DELETE: "#ef4444",
  GET: "#3b82f6",
  PATCH: "#f59e0b",
  POST: "#10b981",
  PUT: "#f59e0b",
};

const JSON_CLASS: Record<JsonToken["type"], string> = {
  key: "text-blue-400",
  keyword: "text-purple-400",
  number: "text-amber-400",
  punct: "text-foreground",
  string: "text-emerald-400",
  text: "text-foreground",
};

function methodColor(method: string): string {
  return METHOD_COLOR[method.toUpperCase()] ?? "#8b8b8b";
}

function statusMeta(status: number): { klass: string; color: string } {
  if (status >= 500) return { color: "#ef4444", klass: "5xx" };
  if (status >= 400) return { color: "#f59e0b", klass: "4xx" };
  if (status >= 300) return { color: "#3b82f6", klass: "3xx" };
  if (status >= 200) return { color: "#10b981", klass: "2xx" };
  return { color: "#8b8b8b", klass: "—" };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatMs(n: number): string {
  return n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`;
}

function parseQuery(url: string): { key: string; value: string }[] {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return [];
  try {
    const params = new URLSearchParams(url.slice(qIdx + 1));
    return [...params.entries()].map(([key, value]) => ({ key, value }));
  } catch {
    return [];
  }
}

function prettyJson(raw: string): { text: string; ok: boolean } {
  try {
    return { ok: true, text: JSON.stringify(JSON.parse(raw), null, 2) };
  } catch {
    return { ok: false, text: raw };
  }
}

function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const re =
    /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|(\s+)|([^\s])/g;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) tokens.push({ text: m[1], type: "key" });
    else if (m[2] !== undefined) tokens.push({ text: m[2], type: "string" });
    else if (m[3] !== undefined) tokens.push({ text: m[3], type: "number" });
    else if (m[4] !== undefined) tokens.push({ text: m[4], type: "keyword" });
    else if (m[5] !== undefined) tokens.push({ text: m[5], type: "text" });
    else tokens.push({ text: m[0], type: "punct" });
  }
  return tokens;
}

function totalTiming(t: TimingPhases): number {
  return PHASE_ORDER.reduce((s, k) => s + (t[k] ?? 0), 0);
}

function HeaderGroup({ title, rows }: { title: string; rows: { key: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
        {title}
      </div>
      <div className="divide-y divide-border/50">
        {rows.map((r) => (
          <div className="flex gap-3 py-1 font-mono" key={r.key}>
            <span className="w-40 shrink-0 truncate text-muted-foreground">{r.key}</span>
            <span className="min-w-0 flex-1 break-all">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function JsonView({ raw }: { raw: string }) {
  const { text, ok } = prettyJson(raw);
  if (!ok) {
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5">
        {text}
      </pre>
    );
  }
  return (
    <pre className="overflow-auto whitespace-pre font-mono text-[11px] leading-5">
      {tokenizeJson(text).map((t, i) => (
        <span className={JSON_CLASS[t.type]} key={i}>
          {t.text}
        </span>
      ))}
    </pre>
  );
}

export function RequestInspector({ request, className }: RequestInspectorProps) {
  const [tab, setTab] = useState<Tab>("headers");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const sm = statusMeta(request.status);
  const mColor = methodColor(request.method);
  const total = request.timing ? totalTiming(request.timing) : null;
  const reqBody = request.requestBody;
  const respBody = request.responseBody;

  const general = [
    { key: "Request URL", value: request.url },
    { key: "Request Method", value: request.method },
    {
      key: "Status Code",
      value: `${request.status}${request.statusText ? ` ${request.statusText}` : ""}`,
    },
  ];
  const reqHeaders = request.requestHeaders
    ? Object.entries(request.requestHeaders).map(([key, value]) => ({ key, value }))
    : [];
  const resHeaders = request.responseHeaders
    ? Object.entries(request.responseHeaders).map(([key, value]) => ({ key, value }))
    : [];
  const query = parseQuery(request.url);

  const timingSegments: {
    key: string;
    label: string;
    color: string;
    left: number;
    width: number;
    dur: number;
  }[] = [];
  if (request.timing) {
    const t = request.timing;
    const denom = totalTiming(t) || 1;
    let off = 0;
    for (const k of PHASE_ORDER) {
      const dur = t[k] ?? 0;
      if (dur <= 0) continue;
      timingSegments.push({
        color: PHASE_META[k].color,
        dur,
        key: k,
        label: PHASE_META[k].label,
        left: (off / denom) * 100,
        width: (dur / denom) * 100,
      });
      off += dur;
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "headers", label: "Headers" },
    { key: "payload", label: "Payload" },
    { key: "timing", label: "Timing" },
    { key: "response", label: "Response" },
  ];

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex items-center gap-2 border-border border-b px-3 py-2">
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase"
          style={{ background: `${mColor}1f`, color: mColor }}
        >
          {request.method}
        </span>
        <span className="group flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate font-mono">{request.url}</span>
          <button
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            onClick={() => copy("url", request.url)}
            type="button"
          >
            {copied === "url" ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
        </span>
        <span
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px]"
          style={{ background: `${sm.color}1f`, color: sm.color }}
        >
          <span className="size-1.5 rounded-full" style={{ background: sm.color }} />
          {request.status}
          {request.statusText ? ` ${request.statusText}` : ""}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {total !== null ? formatMs(total) : null}
          {total !== null && request.size !== undefined ? " · " : ""}
          {request.size !== undefined ? formatBytes(request.size) : null}
        </span>
      </div>

      <div className="flex border-border border-b font-sans">
        {tabs.map((t) => (
          <button
            className={cn(
              "border-transparent border-b-2 px-3 py-1.5 text-[11px] transition-colors",
              tab === t.key
                ? "border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-auto p-3">
        {tab === "headers" ? (
          <>
            <HeaderGroup rows={general} title="General" />
            <HeaderGroup rows={reqHeaders} title="Request Headers" />
            <HeaderGroup rows={resHeaders} title="Response Headers" />
          </>
        ) : null}

        {tab === "payload" ? (
          query.length === 0 && !reqBody ? (
            <p className="py-6 text-center text-muted-foreground italic">No payload</p>
          ) : (
            <>
              <HeaderGroup rows={query} title="Query String Parameters" />
              {reqBody ? (
                <div>
                  <div className="mb-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
                    Request Body
                  </div>
                  <JsonView raw={reqBody} />
                </div>
              ) : null}
            </>
          )
        ) : null}

        {tab === "timing" ? (
          timingSegments.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground italic">No timing data</p>
          ) : (
            <div className="space-y-1.5">
              {timingSegments.map((seg) => (
                <div className="flex items-center gap-2" key={seg.key}>
                  <span className="w-28 shrink-0 text-muted-foreground">{seg.label}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted/40">
                    <div
                      className="absolute h-3 rounded"
                      style={{
                        background: seg.color,
                        left: `${seg.left}%`,
                        width: `${Math.max(seg.width, 1)}%`,
                      }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right tabular-nums">{formatMs(seg.dur)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-border border-t pt-1.5 font-medium">
                <span className="w-28 shrink-0">Total</span>
                <div className="flex-1" />
                <span className="w-14 shrink-0 text-right tabular-nums">
                  {formatMs(total ?? 0)}
                </span>
              </div>
            </div>
          )
        ) : null}

        {tab === "response" ? (
          respBody ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">
                  {request.size !== undefined ? formatBytes(request.size) : ""}
                </span>
                <button
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => copy("resp", respBody)}
                  type="button"
                >
                  {copied === "resp" ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied === "resp" ? "Copied" : "Copy"}
                </button>
              </div>
              <JsonView raw={respBody} />
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground italic">No response body</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export default RequestInspector;
