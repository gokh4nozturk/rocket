"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type MaskMode = "full" | "label" | "partial";

export interface ScrubRule {
  label: string;
  re: RegExp;
}

export interface Segment {
  masked: boolean;
  text: string;
}

export interface ScrubResult {
  counts: Record<string, number>;
  segments: Segment[];
  total: number;
}

export interface LogScrubberProps {
  className?: string;
  defaultMode?: MaskMode;
  defaultValue?: string;
}

const COLOR_MASK = "#f59e0b";
const COLOR_ERROR = "#ef4444";

const MODES: MaskMode[] = ["label", "partial", "full"];

export const BUILTIN_RULES: { key: string; label: string; re: RegExp }[] = [
  { key: "email", label: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { key: "ip", label: "ip", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { key: "card", label: "card", re: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g },
  { key: "jwt", label: "token", re: /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g },
  {
    key: "uuid",
    label: "uuid",
    re: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  },
];

export const SCRUBBER_SAMPLE = `2026-06-15T08:01:13Z user ada@acme.io logged in from 10.0.12.5
card 4242 4242 4242 4242 token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc123
trace 019bc1a3-0583-7abc-8def-0123456789ab done`;

function maskText(s: string, label: string, mode: MaskMode): string {
  if (mode === "label") return `‹${label}›`;
  if (mode === "full") return "•".repeat(s.length);
  return s.length > 4 ? "•".repeat(s.length - 4) + s.slice(-4) : "•".repeat(s.length);
}

export function scrub(text: string, rules: ScrubRule[], mode: MaskMode): ScrubResult {
  const spans: { end: number; label: string; start: number; text: string }[] = [];
  for (const r of rules) {
    r.re.lastIndex = 0;
    for (let m = r.re.exec(text); m !== null; m = r.re.exec(text)) {
      const full = m[0] ?? "";
      if (full === "") {
        r.re.lastIndex++;
        continue;
      }
      spans.push({ end: m.index + full.length, label: r.label, start: m.index, text: full });
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const counts: Record<string, number> = {};
  const segments: Segment[] = [];
  let pos = 0;
  let last = -1;
  let total = 0;
  for (const sp of spans) {
    if (sp.start < last) continue;
    if (sp.start > pos) segments.push({ masked: false, text: text.slice(pos, sp.start) });
    segments.push({ masked: true, text: maskText(sp.text, sp.label, mode) });
    counts[sp.label] = (counts[sp.label] ?? 0) + 1;
    total++;
    pos = sp.end;
    last = sp.end;
  }
  if (pos < text.length) segments.push({ masked: false, text: text.slice(pos) });
  return { counts, segments, total };
}

export function LogScrubber({
  className,
  defaultMode = "label",
  defaultValue = SCRUBBER_SAMPLE,
}: LogScrubberProps) {
  const [text, setText] = useState(defaultValue);
  const [mode, setMode] = useState<MaskMode>(defaultMode);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BUILTIN_RULES.map((r) => [r.key, true])),
  );
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState(false);

  const rules: ScrubRule[] = BUILTIN_RULES.filter((r) => enabled[r.key]).map((r) => ({
    label: r.label,
    re: r.re,
  }));
  let customError = false;
  if (custom.trim() !== "") {
    try {
      rules.push({ label: "custom", re: new RegExp(custom, "g") });
    } catch {
      customError = true;
    }
  }

  const result = scrub(text, rules, mode);
  const maskedText = result.segments.map((s) => s.text).join("");
  const countList = [...BUILTIN_RULES.map((r) => r.label), "custom"]
    .filter((label, i, arr) => arr.indexOf(label) === i)
    .filter((label) => (result.counts[label] ?? 0) > 0)
    .map((label) => ({ label, n: result.counts[label] ?? 0 }));

  function copyOutput() {
    void navigator.clipboard.writeText(maskedText).then(() => {
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
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">rules</span>
            {BUILTIN_RULES.map((r) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  enabled[r.key]
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground line-through hover:bg-muted hover:text-foreground",
                )}
                key={r.key}
                onClick={() => {
                  setEnabled((prev) => ({ ...prev, [r.key]: !prev[r.key] }));
                }}
                type="button"
              >
                {r.key}
              </button>
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">mask</span>
            {MODES.map((m) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  m === mode
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                key={m}
                onClick={() => {
                  setMode(m);
                }}
                type="button"
              >
                {m}
              </button>
            ))}
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">custom</span>
          <input
            aria-label="Custom regex"
            className={cn(
              "h-7 flex-1 rounded-md border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring",
              customError ? "border-red-500" : "border-border",
            )}
            onChange={(e) => {
              setCustom(e.target.value);
            }}
            placeholder="optional regex, e.g. cus_\w+"
            spellCheck={false}
            type="text"
            value={custom}
          />
          {customError && <span style={{ color: COLOR_ERROR }}>invalid regex</span>}
        </span>
        <textarea
          aria-label="Log text"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setText(e.target.value);
          }}
          rows={4}
          spellCheck={false}
          value={text}
        />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            scrubbed
          </span>
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={copyOutput}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">
          {result.segments.map((s, i) =>
            s.masked ? (
              <span key={i} style={{ backgroundColor: `${COLOR_MASK}26`, color: COLOR_MASK }}>
                {s.text}
              </span>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </pre>
        <div className="flex flex-wrap items-center gap-1.5 border-border border-t pt-2">
          {result.total === 0 ? (
            <span className="text-muted-foreground">no matches</span>
          ) : (
            <>
              {countList.map((c) => (
                <span
                  className="rounded px-1 py-0.5 font-mono text-[10px]"
                  key={c.label}
                  style={{ backgroundColor: `${COLOR_MASK}1f`, color: COLOR_MASK }}
                >
                  {c.label} ×{c.n}
                </span>
              ))}
              <span className="ml-auto text-muted-foreground">
                {result.total} redaction{result.total === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogScrubber;
