"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type EnvLevel = "error" | "info" | "warn";

export interface EnvEntry {
  key: string;
  line: number;
  quoted: boolean;
  sensitive: boolean;
  single: boolean;
  value: string;
}

export interface EnvFinding {
  level: EnvLevel;
  line: number;
  msg: string;
}

export interface EnvLintResult {
  count: number;
  entries: EnvEntry[];
  errors: number;
  findings: EnvFinding[];
  warns: number;
}

export interface EnvLinterProps {
  className?: string;
  defaultValue?: string;
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE_RE = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|KEY/i;
const REF_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;
const LEVEL_ORDER: EnvLevel[] = ["error", "warn", "info"];

const LEVEL_COLOR: Record<EnvLevel, string> = {
  error: "#ef4444",
  info: "#3b82f6",
  warn: "#f59e0b",
};

export const ENV_SAMPLE = `# App config
NODE_ENV=production
PORT = 3000
API_KEY="sk_live_abc123"
DATABASE_URL=postgres://u:p@host/db
EMPTY=
bad-key=oops
MISSING_VALUE
GREETING=hello world
HOST=\${HOSTNAME}
NODE_ENV=staging`;

export function lintEnv(text: string): EnvLintResult {
  const lines = text.split("\n");
  const entries: EnvEntry[] = [];
  const findings: EnvFinding[] = [];
  const firstLine: Record<string, number> = {};
  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const lt = line.replace(/^\s+/, "");
    if (lt === "" || lt.startsWith("#")) return;
    const s = lt.replace(/^export\s+/, "");
    const eq = s.indexOf("=");
    if (eq < 0) {
      findings.push({ level: "error", line: ln, msg: "missing '='" });
      return;
    }
    const keyRaw = s.slice(0, eq);
    const valueRaw = s.slice(eq + 1);
    if (/\s$/.test(keyRaw) || /^\s/.test(valueRaw)) {
      findings.push({ level: "warn", line: ln, msg: "spaces around '=' (will be trimmed)" });
    }
    const key = keyRaw.trim();
    if (!KEY_RE.test(key)) {
      findings.push({ level: "error", line: ln, msg: `invalid key name "${key}"` });
      return;
    }
    const vt = valueRaw.trim();
    const first = vt.charAt(0);
    const last = vt.charAt(vt.length - 1);
    let value = vt;
    let quoted = false;
    let single = false;
    if (vt.length >= 2 && ((first === '"' && last === '"') || (first === "'" && last === "'"))) {
      quoted = true;
      single = first === "'";
      value = vt.slice(1, -1);
    } else if (first === '"' || first === "'") {
      findings.push({ level: "error", line: ln, msg: "unclosed quote" });
    } else if (/\s/.test(vt)) {
      findings.push({ level: "warn", line: ln, msg: "unquoted value with spaces" });
    }
    if (vt === "") findings.push({ level: "info", line: ln, msg: "empty value" });
    const seenAt = firstLine[key];
    if (seenAt !== undefined) {
      findings.push({ level: "warn", line: ln, msg: `duplicate key (overrides line ${seenAt})` });
    } else {
      firstLine[key] = ln;
    }
    entries.push({ key, line: ln, quoted, sensitive: SENSITIVE_RE.test(key), single, value });
  });
  const defined = new Set(entries.map((e) => e.key));
  for (const e of entries) {
    if (e.single) continue;
    REF_RE.lastIndex = 0;
    for (let m = REF_RE.exec(e.value); m !== null; m = REF_RE.exec(e.value)) {
      const v = m[1] ?? m[2] ?? "";
      if (!defined.has(v)) {
        findings.push({ level: "warn", line: e.line, msg: `references undefined \${${v}}` });
      }
    }
  }
  findings.sort(
    (a, b) => a.line - b.line || LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );
  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.filter((f) => f.level === "warn").length;
  return { count: entries.length, entries, errors, findings, warns };
}

export function EnvLinter({ className, defaultValue = ENV_SAMPLE }: EnvLinterProps) {
  const [value, setValue] = useState(defaultValue);
  const [reveal, setReveal] = useState(false);

  const result = lintEnv(value);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <textarea
          aria-label="env file"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="KEY=value"
          rows={7}
          spellCheck={false}
          value={value}
        />
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
              reveal
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => {
              setReveal((p) => !p);
            }}
            type="button"
          >
            reveal secrets
          </button>
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setValue(ENV_SAMPLE);
            }}
            type="button"
          >
            load sample
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <span>
            <span className="font-medium">{result.count}</span>{" "}
            <span className="text-muted-foreground">variable{result.count === 1 ? "" : "s"}</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span style={{ color: result.errors > 0 ? LEVEL_COLOR.error : undefined }}>
            {result.errors} error{result.errors === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span style={{ color: result.warns > 0 ? LEVEL_COLOR.warn : undefined }}>
            {result.warns} warning{result.warns === 1 ? "" : "s"}
          </span>
        </div>
        {result.findings.length > 0 && (
          <div className="flex flex-col gap-1 border-border border-t pt-2">
            {result.findings.map((f, i) => (
              <div className="flex items-baseline gap-2" key={`${f.line}-${i}`}>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  L{f.line}
                </span>
                <span
                  className="shrink-0 font-medium font-mono text-[10px] uppercase"
                  style={{ color: LEVEL_COLOR[f.level] }}
                >
                  {f.level}
                </span>
                <span className="break-all font-mono">{f.msg}</span>
              </div>
            ))}
          </div>
        )}
        {result.entries.length > 0 && (
          <div className="grid grid-cols-[10rem_1fr] gap-x-2 gap-y-1.5 border-border border-t pt-2">
            {result.entries.map((e) => (
              <div className="contents" key={`${e.line}-${e.key}`}>
                <span className="truncate font-mono text-muted-foreground">{e.key}</span>
                <span className="break-all font-mono">
                  {e.value === "" ? (
                    <span className="text-muted-foreground italic">(empty)</span>
                  ) : e.sensitive && !reveal ? (
                    <span className="text-muted-foreground">{"•".repeat(8)}</span>
                  ) : (
                    e.value
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EnvLinter;
