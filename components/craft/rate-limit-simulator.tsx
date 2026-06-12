"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Pattern = "ramp" | "spike" | "steady";

export interface RateLimitSimulatorProps {
  className?: string;
  defaultCapacity?: number;
  defaultRate?: number;
  defaultRefill?: number;
}

export interface Tick {
  allowed: number;
  denied: number;
  requests: number;
  t: number;
  tokens: number;
}

const COLOR_ALLOWED = "#10b981";
const COLOR_DENIED = "#ef4444";
const COLOR_WARN = "#f59e0b";

const PATTERNS: Pattern[] = ["steady", "spike", "ramp"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function requestsAt(pattern: Pattern, rate: number, t: number, duration: number): number {
  if (pattern === "spike") return t === 1 ? rate * 3 : rate;
  if (pattern === "ramp") return Math.round((2 * rate * t) / duration);
  return rate;
}

export function simulate(
  pattern: Pattern,
  capacity: number,
  refill: number,
  rate: number,
  duration: number,
): Tick[] {
  const ticks: Tick[] = [];
  let tokens = capacity;
  for (let t = 1; t <= duration; t++) {
    tokens = Math.min(capacity, tokens + refill);
    const requests = requestsAt(pattern, rate, t, duration);
    const allowed = Math.min(requests, tokens);
    ticks.push({ allowed, denied: requests - allowed, requests, t, tokens });
    tokens -= allowed;
  }
  return ticks;
}

export function RateLimitSimulator({
  className,
  defaultCapacity = 10,
  defaultRate = 8,
  defaultRefill = 5,
}: RateLimitSimulatorProps) {
  const [pattern, setPattern] = useState<Pattern>("steady");
  const [capacity, setCapacity] = useState(String(defaultCapacity));
  const [refill, setRefill] = useState(String(defaultRefill));
  const [rate, setRate] = useState(String(defaultRate));
  const [duration, setDuration] = useState("10");

  const capN = Number.parseFloat(capacity);
  const capValid = Number.isFinite(capN) && capN > 0;
  const refillParsed = Number.parseFloat(refill);
  const refillN = Number.isFinite(refillParsed) && refillParsed >= 0 ? refillParsed : 5;
  const rateParsed = Number.parseFloat(rate);
  const rateN = Number.isFinite(rateParsed) && rateParsed > 0 ? rateParsed : 8;
  const durationParsed = Number.parseFloat(duration);
  const durationN = Number.isNaN(durationParsed) ? 10 : clamp(Math.round(durationParsed), 1, 30);

  const ticks = capValid ? simulate(pattern, capN, refillN, rateN, durationN) : [];
  let totalAllowed = 0;
  let totalDenied = 0;
  let totalRequests = 0;
  for (const tick of ticks) {
    totalAllowed += tick.allowed;
    totalDenied += tick.denied;
    totalRequests += tick.requests;
  }
  const pct = totalRequests > 0 ? Math.round((totalDenied / totalRequests) * 100) : 0;
  const exceeds = rateN > refillN;

  const fields: {
    invalid: boolean;
    label: string;
    set: (v: string) => void;
    suffix: string | null;
    value: string;
  }[] = [
    {
      invalid: !capValid,
      label: "Bucket capacity",
      set: setCapacity,
      suffix: null,
      value: capacity,
    },
    {
      invalid: false,
      label: "Refill per second",
      set: setRefill,
      suffix: "token/s",
      value: refill,
    },
    {
      invalid: false,
      label: "Incoming requests per second",
      set: setRate,
      suffix: "req/s",
      value: rate,
    },
    {
      invalid: false,
      label: "Duration in seconds",
      set: setDuration,
      suffix: "s",
      value: duration,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-border border-b p-3">
        <div className="flex items-center gap-1.5">
          {PATTERNS.map((p) => (
            <button
              className={cn(
                "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                p === pattern
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={p}
              onClick={() => {
                setPattern(p);
              }}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fields.map((f) => (
            <span className="flex items-center gap-1" key={f.label}>
              <input
                aria-label={f.label}
                className={cn(
                  "h-7 w-16 rounded-md border bg-transparent px-2 text-right font-mono text-xs outline-none focus:border-ring",
                  f.invalid ? "border-red-500" : "border-border",
                )}
                onChange={(e) => {
                  f.set(e.target.value);
                }}
                spellCheck={false}
                type="text"
                value={f.value}
              />
              {f.suffix !== null && <span className="text-muted-foreground">{f.suffix}</span>}
            </span>
          ))}
        </div>
      </div>
      {capValid ? (
        <>
          <div className="divide-y divide-border font-mono">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <span>t</span>
              <span>tokens</span>
              <span>requests</span>
              <span>allowed</span>
              <span>denied</span>
            </div>
            {ticks.map((tick) => (
              <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr] gap-2 px-3 py-1" key={tick.t}>
                <span className="text-muted-foreground">t{tick.t}</span>
                <span>{fmtNum(tick.tokens)}</span>
                <span>{fmtNum(tick.requests)}</span>
                <span style={{ color: COLOR_ALLOWED }}>{fmtNum(tick.allowed)}</span>
                {tick.denied > 0 ? (
                  <span style={{ color: COLOR_DENIED }}>{fmtNum(tick.denied)}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 border-border border-t p-3">
            <p>
              <span className="text-muted-foreground">total:</span>{" "}
              <span className="font-medium font-mono" style={{ color: COLOR_ALLOWED }}>
                {fmtNum(totalAllowed)} allowed
              </span>{" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="font-medium font-mono" style={{ color: COLOR_DENIED }}>
                {fmtNum(totalDenied)} denied ({pct}%)
              </span>
            </p>
            {exceeds ? (
              <p style={{ color: COLOR_WARN }}>
                sustained {fmtNum(rateN)} req/s exceeds refill {fmtNum(refillN)}
                /s — denials grow without backoff
              </p>
            ) : (
              <p className="text-muted-foreground">refill keeps up — bucket absorbs bursts</p>
            )}
          </div>
        </>
      ) : (
        <p className="p-3" style={{ color: COLOR_DENIED }}>
          enter a capacity &gt; 0
        </p>
      )}
    </div>
  );
}

export default RateLimitSimulator;
