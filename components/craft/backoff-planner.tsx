"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Strategy = "fixed" | "linear" | "exponential";

export interface BackoffPlannerProps {
  defaultStrategy?: Strategy;
  defaultBaseMs?: number;
  defaultMaxRetries?: number;
  className?: string;
}

interface Attempt {
  n: number;
  delay: number;
  capped: boolean;
  cumulative: number;
}

const STRATEGIES: Strategy[] = ["fixed", "linear", "exponential"];

function clampNum(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) {
    return `${Math.round(s * 10) / 10}s`;
  }
  let rest = Math.floor(s + 1e-6);
  const units = [
    { label: "h", secs: 3600 },
    { label: "m", secs: 60 },
    { label: "s", secs: 1 },
  ];
  const parts: string[] = [];
  for (const u of units) {
    const v = Math.floor(rest / u.secs);
    if (v > 0) {
      parts.push(`${v}${u.label}`);
      rest -= v * u.secs;
    }
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(" ") : "0s";
}

function buildAttempts(
  strategy: Strategy,
  base: number,
  mult: number,
  cap: number,
  retries: number,
): Attempt[] {
  const out: Attempt[] = [];
  let cumulative = 0;
  for (let n = 1; n <= retries; n++) {
    const raw =
      strategy === "fixed" ? base : strategy === "linear" ? base * n : base * mult ** (n - 1);
    const delay = cap > 0 ? Math.min(raw, cap) : raw;
    cumulative += delay;
    out.push({ capped: cap > 0 && raw > cap, cumulative, delay, n });
  }
  return out;
}

export function BackoffPlanner({
  defaultStrategy = "exponential",
  defaultBaseMs = 1000,
  defaultMaxRetries = 6,
  className,
}: BackoffPlannerProps) {
  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy);
  const [baseMs, setBaseMs] = useState(String(defaultBaseMs));
  const [multiplier, setMultiplier] = useState("2");
  const [capMs, setCapMs] = useState("30000");
  const [retries, setRetries] = useState(String(defaultMaxRetries));
  const [jitter, setJitter] = useState(false);

  const base = Number.parseFloat(baseMs);
  const baseValid = Number.isFinite(base) && base > 0;
  const multParsed = Number.parseFloat(multiplier);
  const mult = Number.isFinite(multParsed) && multParsed >= 1 ? multParsed : 2;
  const capParsed = Number.parseFloat(capMs);
  const cap = Number.isFinite(capParsed) && capParsed > 0 ? capParsed : 0;
  const retriesParsed = Number.parseFloat(retries);
  const retriesN = Number.isFinite(retriesParsed) ? clampNum(Math.round(retriesParsed), 1, 20) : 1;

  const attempts = baseValid ? buildAttempts(strategy, base, mult, cap, retriesN) : [];
  const total = attempts.length > 0 ? attempts[attempts.length - 1].cumulative : 0;

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
      on
        ? "border-foreground/30 bg-muted font-medium text-foreground"
        : "border-border text-muted-foreground hover:text-foreground",
    );

  const numClass =
    "h-7 rounded-md border border-border bg-background px-1.5 text-right font-mono text-xs outline-none focus:border-foreground/30";

  return (
    <div className={cn("rounded-lg border border-border bg-card text-xs", className)}>
      <div className="space-y-2 border-border border-b px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {STRATEGIES.map((s) => (
            <button
              className={chip(strategy === s)}
              key={s}
              onClick={() => setStrategy(s)}
              type="button"
            >
              {s}
            </button>
          ))}
          <button
            className={cn(chip(jitter), "ml-auto")}
            onClick={() => setJitter((v) => !v)}
            type="button"
          >
            full jitter
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">base</span>
            <input
              aria-label="Base delay in ms"
              className={cn(numClass, "w-20", baseValid ? "border-border" : "border-red-500/60")}
              onChange={(e) => setBaseMs(e.target.value)}
              value={baseMs}
            />
            <span className="text-muted-foreground">ms</span>
          </label>
          {strategy === "exponential" ? (
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">×</span>
              <input
                aria-label="Multiplier"
                className={cn(numClass, "w-12")}
                onChange={(e) => setMultiplier(e.target.value)}
                value={multiplier}
              />
            </label>
          ) : null}
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">cap</span>
            <input
              aria-label="Max delay cap in ms"
              className={cn(numClass, "w-20")}
              onChange={(e) => setCapMs(e.target.value)}
              value={capMs}
            />
            <span className="text-muted-foreground">ms · 0 = no cap</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">retries</span>
            <input
              aria-label="Max retries"
              className={cn(numClass, "w-12")}
              onChange={(e) => setRetries(e.target.value)}
              value={retries}
            />
          </label>
        </div>
        {baseValid ? null : <p className="text-[11px] text-red-500">enter a base delay &gt; 0</p>}
      </div>

      {baseValid ? (
        <>
          <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span>#</span>
            <span>delay</span>
            <span>total waited</span>
          </div>
          <div className="divide-y divide-border/60 font-mono">
            {attempts.map((a) => (
              <div
                className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-3 py-1"
                key={a.n}
              >
                <span className="text-muted-foreground">#{a.n}</span>
                <span className="flex items-center gap-1.5">
                  {jitter ? `0 – ${fmtMs(a.delay)}` : fmtMs(a.delay)}
                  {a.capped ? (
                    <span className="rounded bg-amber-500/15 px-1 py-px font-medium font-sans text-[10px] text-amber-500">
                      capped
                    </span>
                  ) : null}
                </span>
                <span>{fmtMs(a.cumulative)}</span>
              </div>
            ))}
          </div>
          <div className="border-border border-t px-3 py-2">
            total wait{jitter ? " (worst case)" : ""}:{" "}
            <span className="font-medium font-mono">{fmtMs(total)}</span>
            <span className="ml-1 text-muted-foreground">after {retriesN} retries</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default BackoffPlanner;
