"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface UrlInspectorProps {
  className?: string;
  defaultValue?: string;
}

const COLOR_ERROR = "#ef4444";
const COLOR_VAL = "#f59e0b";
const COLOR_KEY = "#38bdf8";

const DEFAULT_PORTS: Record<string, string> = {
  "ftp:": "21",
  "http:": "80",
  "https:": "443",
  "ws:": "80",
  "wss:": "443",
};

export const URL_SAMPLE =
  "https://api.acme.io/v1/orders?status=active&limit=20&utm_source=newsletter&tag=a%20b#section-2";

export function UrlInspector({ className, defaultValue = URL_SAMPLE }: UrlInspectorProps) {
  const [value, setValue] = useState(defaultValue);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const trimmed = value.trim();
  let url: URL | null = null;
  let invalid = false;
  if (trimmed !== "") {
    try {
      url = new URL(trimmed);
    } catch {
      invalid = true;
    }
  }

  const entries = url === null ? [] : [...url.searchParams.entries()];
  const segments = url === null ? [] : url.pathname.split("/").filter(Boolean);

  function copy(key: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 1200);
    });
  }

  function drop(i: number) {
    try {
      const u = new URL(value.trim());
      const all = [...u.searchParams.entries()];
      const sp = new URLSearchParams();
      all.forEach(([k, v], idx) => {
        if (idx !== i) sp.append(k, v);
      });
      u.search = sp.toString();
      setValue(u.href);
    } catch {
      return;
    }
  }

  const breakdown: { label: string; value: string }[] =
    url === null
      ? []
      : [
          { label: "scheme", value: url.protocol.replace(/:$/, "") },
          { label: "host", value: url.hostname },
          {
            label: "port",
            value:
              url.port !== ""
                ? url.port
                : DEFAULT_PORTS[url.protocol] !== undefined
                  ? `${DEFAULT_PORTS[url.protocol]} (default)`
                  : "—",
          },
          { label: "path", value: url.pathname },
          { label: "hash", value: url.hash !== "" ? url.hash.slice(1) : "—" },
        ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <input
          aria-label="URL"
          className={cn(
            "h-7 w-full rounded-md border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring",
            invalid ? "border-red-500" : "border-border",
          )}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="https://host/path?query"
          spellCheck={false}
          type="text"
          value={value}
        />
      </div>
      <div className="p-3">
        {trimmed === "" ? (
          <p className="text-muted-foreground">Paste a URL to inspect</p>
        ) : invalid || url === null ? (
          <p style={{ color: COLOR_ERROR }}>invalid URL</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[4rem_1fr] items-center gap-x-2 gap-y-1.5">
              {breakdown.map((b) => (
                <div className="contents" key={b.label}>
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="break-all font-mono">{b.value}</span>
                </div>
              ))}
            </div>
            {segments.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  segments
                </span>
                {segments.map((s, i) => (
                  <span
                    className="rounded border border-border px-1.5 py-0.5 font-mono text-muted-foreground"
                    key={`${i}-${s}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1.5 border-border border-t pt-2">
              <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                query ({entries.length})
              </p>
              {entries.length === 0 ? (
                <p className="text-muted-foreground">no query parameters</p>
              ) : (
                <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-x-2 gap-y-1.5">
                  {entries.map(([k, v], i) => (
                    <div className="contents" key={`${i}-${k}`}>
                      <span className="truncate font-mono" style={{ color: COLOR_KEY }}>
                        {k}
                      </span>
                      <span className="break-all font-mono" style={{ color: COLOR_VAL }}>
                        {v === "" ? (
                          <span className="text-muted-foreground italic">(empty)</span>
                        ) : (
                          v
                        )}
                      </span>
                      <button
                        aria-label={`Copy ${k}`}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          copy(`p${i}`, v);
                        }}
                        type="button"
                      >
                        {copiedKey === `p${i}` ? "Copied" : "Copy"}
                      </button>
                      <button
                        aria-label={`Drop ${k}`}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          drop(i);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-border border-t pt-2">
              <span className="min-w-0 flex-1 break-all font-mono text-muted-foreground">
                {url.href}
              </span>
              <button
                className="shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  copy("norm", url?.href ?? "");
                }}
                type="button"
              >
                {copiedKey === "norm" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UrlInspector;
