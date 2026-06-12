"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SloCalculatorProps {
  defaultTarget?: number;
  defaultWindowDays?: number;
  className?: string;
}

const TARGET_PRESETS = [99, 99.5, 99.9, 99.95, 99.99];
const WINDOWS = [7, 30, 90] as const;
type WindowDays = (typeof WINDOWS)[number];

function fmtDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  if (totalSeconds < 1) return `${totalSeconds.toFixed(1)}s`;
  let rest = Math.floor(totalSeconds + 1e-6);
  const units = [
    { label: "d", secs: 86_400 },
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

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function parseNum(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function SloCalculator({
  defaultTarget = 99.9,
  defaultWindowDays = 30,
  className,
}: SloCalculatorProps) {
  const [targetInput, setTargetInput] = useState(String(defaultTarget));
  const [windowDays, setWindowDays] = useState<WindowDays>(
    (WINDOWS as readonly number[]).includes(defaultWindowDays)
      ? (defaultWindowDays as WindowDays)
      : 30,
  );
  const [requestsPerDay, setRequestsPerDay] = useState("250000");
  const [downtimeMin, setDowntimeMin] = useState("0");

  const target = Number.parseFloat(targetInput);
  const valid = Number.isFinite(target) && target > 0 && target < 100;
  const frac = valid ? 1 - target / 100 : 0;

  const allowedSec = windowDays * 86_400 * frac;
  const perDaySec = 86_400 * frac;
  const perWeekSec = 604_800 * frac;
  const reqPerDay = parseNum(requestsPerDay);
  const allowedFailures = Math.round(reqPerDay * windowDays * frac);
  const downSec = parseNum(downtimeMin) * 60;
  const burnPct = allowedSec > 0 ? (downSec / allowedSec) * 100 : 0;
  const remainingSec = Math.max(0, allowedSec - downSec);
  const status =
    burnPct >= 100
      ? { color: "#ef4444", label: "budget exhausted" }
      : burnPct >= 75
        ? { color: "#f59e0b", label: "at risk" }
        : { color: "#10b981", label: "on track" };

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
      on
        ? "border-foreground/30 bg-muted font-medium text-foreground"
        : "border-border text-muted-foreground hover:text-foreground",
    );

  return (
    <div className={cn("rounded-lg border border-border bg-card text-xs", className)}>
      <div className="space-y-2 border-border border-b px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-12 text-muted-foreground">Target</span>
          {TARGET_PRESETS.map((p) => (
            <button
              className={chip(valid && target === p)}
              key={p}
              onClick={() => setTargetInput(String(p))}
              type="button"
            >
              {p}%
            </button>
          ))}
          <span className="flex items-center gap-1">
            <input
              aria-label="Target percentage"
              className={cn(
                "h-7 w-20 rounded-md border bg-background px-1.5 text-right font-mono text-xs outline-none focus:border-foreground/30",
                valid ? "border-border" : "border-red-500/60",
              )}
              onChange={(e) => setTargetInput(e.target.value)}
              value={targetInput}
            />
            <span className="text-muted-foreground">%</span>
          </span>
        </div>
        {valid ? null : (
          <p className="text-[11px] text-red-500">enter a target between 0 and 100</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-12 text-muted-foreground">Window</span>
          {WINDOWS.map((w) => (
            <button
              className={chip(windowDays === w)}
              key={w}
              onClick={() => setWindowDays(w)}
              type="button"
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-3 py-2.5">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Allowed downtime
          </div>
          <div className="font-mono text-lg">
            {valid ? fmtDuration(allowedSec) : "—"}
            <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">
              per {windowDays}d window
            </span>
          </div>
          <div className="mt-0.5 flex gap-4 font-mono text-[11px] text-muted-foreground">
            <span>per day {valid ? fmtDuration(perDaySec) : "—"}</span>
            <span>per week {valid ? fmtDuration(perWeekSec) : "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Requests per day</span>
          <input
            aria-label="Requests per day"
            className="h-7 w-24 rounded-md border border-border bg-background px-1.5 text-right font-mono text-xs outline-none focus:border-foreground/30"
            onChange={(e) => setRequestsPerDay(e.target.value)}
            value={requestsPerDay}
          />
          <span className="font-mono">
            {valid ? `≈ ${fmtCount(allowedFailures)} failed requests / ${windowDays}d` : "—"}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Downtime so far (min)</span>
            <input
              aria-label="Downtime so far in minutes"
              className="h-7 w-20 rounded-md border border-border bg-background px-1.5 text-right font-mono text-xs outline-none focus:border-foreground/30"
              onChange={(e) => setDowntimeMin(e.target.value)}
              value={downtimeMin}
            />
            {valid ? (
              <span
                className="rounded-full px-1.5 py-0.5 font-medium text-[10px]"
                style={{ background: `${status.color}1f`, color: status.color }}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          {valid ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: status.color, width: `${Math.min(burnPct, 100)}%` }}
                />
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {burnPct.toFixed(1)}% used · {fmtDuration(remainingSec)} left
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SloCalculator;
