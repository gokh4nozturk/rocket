"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ParsedCurl {
  body: string;
  headers: [string, string][];
  method: string;
  url: string | null;
}

export interface CurlConverterProps {
  className?: string;
  defaultValue?: string;
}

const COLOR_ERROR = "#ef4444";

const METHOD_COLOR: Record<string, string> = {
  DELETE: "#ef4444",
  GET: "#3b82f6",
  PATCH: "#a855f7",
  POST: "#10b981",
  PUT: "#f59e0b",
};

const DATA_FLAGS = [
  "-d",
  "--data",
  "--data-raw",
  "--data-binary",
  "--data-ascii",
  "--data-urlencode",
];
const ARG_FLAGS = new Set([
  ...DATA_FLAGS,
  "-A",
  "-H",
  "-X",
  "-b",
  "-e",
  "-u",
  "--cookie",
  "--header",
  "--referer",
  "--request",
  "--url",
  "--user",
  "--user-agent",
]);
const BOOL_FLAGS = new Set([
  "--compressed",
  "--fail",
  "--globoff",
  "--include",
  "--insecure",
  "--location",
  "--show-error",
  "--silent",
  "--verbose",
  "-f",
  "-g",
  "-i",
  "-k",
  "-s",
  "-v",
]);

export const CURL_SAMPLE = `curl -X POST https://api.acme.io/v1/orders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_123" \\
  -d '{"sku":"TSHIRT-M","qty":2}'`;

export function tokenizeCurl(s: string): string[] {
  const tokens: string[] = [];
  const n = s.length;
  let cur = "";
  let has = false;
  let i = 0;
  while (i < n) {
    const c = s.charAt(i);
    if (c === "\\" && s.charAt(i + 1) === "\n") {
      i += 2;
      continue;
    }
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      if (has) {
        tokens.push(cur);
        cur = "";
        has = false;
      }
      i++;
      continue;
    }
    if (c === "'") {
      has = true;
      i++;
      while (i < n && s.charAt(i) !== "'") {
        cur += s.charAt(i);
        i++;
      }
      i++;
      continue;
    }
    if (c === '"') {
      has = true;
      i++;
      while (i < n && s.charAt(i) !== '"') {
        if (s.charAt(i) === "\\" && i + 1 < n) {
          const nx = s.charAt(i + 1);
          if (nx === '"' || nx === "\\" || nx === "$" || nx === "`") {
            cur += nx;
            i += 2;
            continue;
          }
        }
        cur += s.charAt(i);
        i++;
      }
      i++;
      continue;
    }
    if (c === "\\" && i + 1 < n) {
      has = true;
      cur += s.charAt(i + 1);
      i += 2;
      continue;
    }
    has = true;
    cur += c;
    i++;
  }
  if (has) tokens.push(cur);
  return tokens;
}

function basicAuth(userpass: string): string {
  try {
    return `Basic ${btoa(userpass)}`;
  } catch {
    return `Basic ${userpass}`;
  }
}

export function parseCurl(input: string): ParsedCurl {
  const toks = tokenizeCurl(input);
  let url: string | null = null;
  let method: string | null = null;
  let useGet = false;
  const headers: [string, string][] = [];
  const data: string[] = [];
  let i = toks[0] === "curl" ? 1 : 0;
  for (; i < toks.length; i++) {
    const tk = toks[i] ?? "";
    const next = () => {
      i += 1;
      return toks[i] ?? "";
    };
    if (tk === "-X" || tk === "--request") {
      method = next();
    } else if (tk === "-H" || tk === "--header") {
      const h = next();
      const ci = h.indexOf(":");
      if (ci >= 0) headers.push([h.slice(0, ci).trim(), h.slice(ci + 1).trim()]);
    } else if (DATA_FLAGS.includes(tk)) {
      data.push(next());
    } else if (tk === "-u" || tk === "--user") {
      headers.push(["Authorization", basicAuth(next())]);
    } else if (tk === "-b" || tk === "--cookie") {
      headers.push(["Cookie", next()]);
    } else if (tk === "-A" || tk === "--user-agent") {
      headers.push(["User-Agent", next()]);
    } else if (tk === "-e" || tk === "--referer") {
      headers.push(["Referer", next()]);
    } else if (tk === "-G" || tk === "--get") {
      useGet = true;
    } else if (tk === "--url") {
      url = next();
    } else if (BOOL_FLAGS.has(tk)) {
      // ignore valueless flag
    } else if (tk.startsWith("-")) {
      if (ARG_FLAGS.has(tk)) next();
    } else if (url === null) {
      url = tk;
    }
  }
  let body = data.join("&");
  if (url !== null && useGet && body !== "") {
    url += (url.includes("?") ? "&" : "?") + body;
    body = "";
  }
  return { body, headers, method: method ?? (body !== "" ? "POST" : "GET"), url };
}

function jsString(s: string): string {
  if (!s.includes("'") && !s.includes("\n") && !s.includes("\\")) return `'${s}'`;
  return JSON.stringify(s);
}

export function toFetch(p: ParsedCurl): string | null {
  if (p.url === null) return null;
  const hasOpts = p.method !== "GET" || p.headers.length > 0 || p.body !== "";
  if (!hasOpts) return `fetch(${jsString(p.url)});`;
  const inner: string[] = [];
  if (p.method !== "GET") inner.push(`  method: ${jsString(p.method)}`);
  if (p.headers.length > 0) {
    const hl = p.headers.map(([k, v]) => `    ${jsString(k)}: ${jsString(v)}`).join(",\n");
    inner.push(`  headers: {\n${hl}\n  }`);
  }
  if (p.body !== "") inner.push(`  body: ${jsString(p.body)}`);
  return `fetch(${jsString(p.url)}, {\n${inner.join(",\n")}\n});`;
}

export function CurlConverter({ className, defaultValue = CURL_SAMPLE }: CurlConverterProps) {
  const [value, setValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);

  const trimmed = value.trim();
  const parsed = trimmed === "" ? null : parseCurl(value);
  const fetchCode = parsed === null ? null : toFetch(parsed);

  function copyOutput(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  }

  const methodColor =
    parsed === null ? undefined : (METHOD_COLOR[parsed.method] ?? "var(--muted-foreground)");

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <textarea
          aria-label="curl command"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="curl https://api.example.com -H ..."
          rows={5}
          spellCheck={false}
          value={value}
        />
        <div className="flex items-center gap-1.5">
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setValue(CURL_SAMPLE);
            }}
            type="button"
          >
            load sample
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {parsed === null ? (
          <p className="text-muted-foreground">Paste a curl command</p>
        ) : parsed.url === null ? (
          <p style={{ color: COLOR_ERROR }}>no URL found</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 font-medium font-mono"
                style={{ backgroundColor: `${methodColor}1f`, color: methodColor }}
              >
                {parsed.method}
              </span>
              <span className="min-w-0 flex-1 break-all font-mono">{parsed.url}</span>
            </div>
            {parsed.headers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  headers ({parsed.headers.length})
                </p>
                <div className="grid grid-cols-[10rem_1fr] gap-x-2 gap-y-1.5">
                  {parsed.headers.map(([k, v], idx) => (
                    <div className="contents" key={`${idx}-${k}`}>
                      <span className="truncate font-mono text-muted-foreground">{k}</span>
                      <span className="break-all font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsed.body !== "" && (
              <div className="flex flex-col gap-1.5">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  body
                </p>
                <p className="break-all font-mono">{parsed.body}</p>
              </div>
            )}
            {fetchCode !== null && (
              <div className="flex flex-col gap-1.5 border-border border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    fetch()
                  </span>
                  <button
                    className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      copyOutput(fetchCode);
                    }}
                    type="button"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">
                  {fetchCode}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CurlConverter;
