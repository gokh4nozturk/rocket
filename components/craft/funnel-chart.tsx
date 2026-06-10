"use client";

import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  id: string;
  label: string;
  value: number;
}

export interface FunnelChartProps {
  steps: FunnelStep[];
  unit?: string;
  className?: string;
}

interface ComputedStep {
  step: FunnelStep;
  pctOfFirst: number;
  pctOfPrev: number;
  prevPctOfFirst: number;
  drop: number;
  dropPct: number;
}

const BAR_COLOR = "#3b82f6";

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtPct(p: number): string {
  if (p <= 0) return "0";
  if (p < 1) return "<1";
  if (p < 10) return p.toFixed(1);
  return String(Math.round(p));
}

function computeSteps(steps: FunnelStep[]): ComputedStep[] {
  const first = steps[0]?.value ?? 0;
  const out: ComputedStep[] = [];
  let prev = first;
  let prevPctOfFirst = 100;
  steps.forEach((step, i) => {
    const pctOfFirst = first > 0 ? (step.value / first) * 100 : 0;
    const pctOfPrev = i === 0 ? 100 : prev > 0 ? (step.value / prev) * 100 : 0;
    const drop = i === 0 ? 0 : Math.max(0, prev - step.value);
    const dropPct = i === 0 || prev <= 0 ? 0 : (drop / prev) * 100;
    out.push({
      drop,
      dropPct,
      pctOfFirst,
      pctOfPrev,
      prevPctOfFirst: i === 0 ? pctOfFirst : prevPctOfFirst,
      step,
    });
    prevPctOfFirst = pctOfFirst;
    prev = step.value;
  });
  return out;
}

export function FunnelChart({ steps, unit, className }: FunnelChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (steps.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No steps
      </div>
    );
  }

  const computed = computeSteps(steps);
  const first = steps[0].value;
  const last = steps[steps.length - 1].value;
  const overall = first > 0 ? (last / first) * 100 : 0;
  const unitStr = unit ? ` ${unit}` : "";
  const hoveredStep = hovered ? (computed.find((c) => c.step.id === hovered) ?? null) : null;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 text-xs", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          Σ {fmtCount(first)}
          {unitStr}
          <span className="ml-1 text-muted-foreground">entered</span>
        </span>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-[11px] text-emerald-500">
          {fmtPct(overall)}% overall
        </span>
      </div>

      <div className="space-y-1">
        {computed.map((c, i) => {
          const isHover = hovered === c.step.id;
          const dim = hovered !== null && !isHover;
          return (
            <div key={c.step.id}>
              {i > 0 ? (
                <div className="flex items-center justify-center gap-1 py-0.5 text-[10px]">
                  {c.drop > 0 ? (
                    <span className="flex items-center gap-0.5 text-red-400/80">
                      <ArrowDown className="size-2.5" />
                      {fmtCount(c.drop)} lost · {fmtPct(c.dropPct)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">no drop-off</span>
                  )}
                </div>
              ) : null}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: hover drives a visual step detail */}
              <div
                className={cn("relative h-7 transition-opacity", dim && "opacity-40")}
                onMouseEnter={() => setHovered(c.step.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded bg-muted/40"
                  style={{ width: `${Math.max(c.prevPctOfFirst, 2)}%` }}
                />
                <div
                  className={cn(
                    "absolute inset-y-0 left-1/2 -translate-x-1/2 rounded transition-all",
                    isHover && "ring-1 ring-foreground",
                  )}
                  style={{ background: BAR_COLOR, width: `${Math.max(c.pctOfFirst, 2)}%` }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
                  <span className="truncate font-medium text-white mix-blend-difference">
                    {c.step.label}
                  </span>
                  <span className="shrink-0 text-white tabular-nums mix-blend-difference">
                    {fmtCount(c.step.value)}
                    <span className="ml-1 opacity-70">({fmtPct(c.pctOfFirst)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        {hoveredStep ? (
          <span>
            <span className="font-medium text-foreground">{hoveredStep.step.label}</span> ·{" "}
            {fmtCount(hoveredStep.step.value)}
            {unitStr} · {fmtPct(hoveredStep.pctOfPrev)}% of previous ·{" "}
            {fmtPct(hoveredStep.pctOfFirst)}% of first
          </span>
        ) : (
          "Hover a step for detail"
        )}
      </div>
    </div>
  );
}

export default FunnelChart;
