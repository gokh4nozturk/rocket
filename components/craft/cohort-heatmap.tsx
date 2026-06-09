"use client";

import { motion } from "motion/react";
import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface Cohort {
  label: string;
  size?: number;
  values: number[];
}

export interface CohortHeatmapProps {
  cohorts: Cohort[];
  periodLabels?: string[];
  className?: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function cellPercent(value: number, size?: number): number {
  if (size !== undefined) return size === 0 ? 0 : clamp((value / size) * 100, 0, 100);
  return clamp(value, 0, 100);
}

function periodCount(cohorts: Cohort[]): number {
  return cohorts.reduce((m, c) => Math.max(m, c.values.length), 0);
}

function columnAverages(cohorts: Cohort[], periods: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let p = 0; p < periods; p++) {
    let sum = 0;
    let n = 0;
    for (const c of cohorts) {
      if (p < c.values.length) {
        sum += cellPercent(c.values[p], c.size);
        n++;
      }
    }
    out.push(n > 0 ? sum / n : null);
  }
  return out;
}

function intensityColor(percent: number): string {
  const a = 0.08 + 0.82 * (percent / 100);
  return `rgba(16, 185, 129, ${a.toFixed(3)})`;
}

function textColor(percent: number): string {
  return percent >= 50 ? "#ffffff" : "var(--foreground)";
}

export function CohortHeatmap({ cohorts, periodLabels, className }: CohortHeatmapProps) {
  const [hovered, setHovered] = useState<{ cohortIndex: number; period: number } | null>(null);

  const periods = useMemo(() => periodCount(cohorts), [cohorts]);
  const averages = useMemo(() => columnAverages(cohorts, periods), [cohorts, periods]);

  if (cohorts.length === 0 || periods === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No cohorts
      </div>
    );
  }

  const labelFor = (p: number) => periodLabels?.[p] ?? String(p);

  let hoverInfo: {
    cohort: string;
    period: string;
    percent: number;
    count?: number;
    size?: number;
  } | null = null;
  if (hovered) {
    const c = cohorts[hovered.cohortIndex];
    if (c && hovered.period < c.values.length) {
      const value = c.values[hovered.period];
      hoverInfo = {
        cohort: c.label,
        count: c.size !== undefined ? value : undefined,
        percent: Math.round(cellPercent(value, c.size)),
        period: labelFor(hovered.period),
        size: c.size,
      };
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 text-xs", className)}>
      <div className="mb-3 flex items-center gap-2 font-sans text-[10px] text-muted-foreground">
        <span>0%</span>
        <div
          className="h-2 w-32 rounded"
          style={{
            background: "linear-gradient(to right, rgba(16,185,129,0.08), rgba(16,185,129,0.9))",
          }}
        />
        <span>100%</span>
        <span className="ml-1">retention</span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `minmax(80px, max-content) repeat(${periods}, minmax(26px, 1fr))`,
          }}
        >
          <div className="px-1 py-1 font-sans text-[10px] text-muted-foreground">Cohort</div>
          {Array.from({ length: periods }, (_, p) => (
            <div
              className="px-0.5 py-1 text-center font-sans text-[10px] text-muted-foreground tabular-nums"
              key={`head-${labelFor(p)}-${p}`}
            >
              {labelFor(p)}
            </div>
          ))}

          {cohorts.map((c, ci) => (
            <Fragment key={`${c.label}-${ci}`}>
              <div className="flex items-center gap-1.5 px-1 py-0.5 font-sans">
                <span className="truncate font-medium">{c.label}</span>
                {c.size !== undefined ? (
                  <span className="shrink-0 rounded bg-muted px-1 text-[9px] text-muted-foreground tabular-nums">
                    {c.size}
                  </span>
                ) : null}
              </div>
              {Array.from({ length: periods }, (_, p) => {
                if (p >= c.values.length) return <div key={`${ci}-${p}`} />;
                const pct = cellPercent(c.values[p], c.size);
                const active = hovered?.cohortIndex === ci && hovered.period === p;
                return (
                  <motion.button
                    animate={{ opacity: 1 }}
                    className={cn(
                      "flex aspect-square min-h-6 items-center justify-center rounded-[2px] font-medium text-[10px] tabular-nums transition-shadow",
                      active && "ring-2 ring-foreground/40",
                    )}
                    initial={{ opacity: 0 }}
                    key={`${ci}-${p}`}
                    onMouseEnter={() => setHovered({ cohortIndex: ci, period: p })}
                    onMouseLeave={() =>
                      setHovered((h) => (h?.cohortIndex === ci && h.period === p ? null : h))
                    }
                    style={{ background: intensityColor(pct), color: textColor(pct) }}
                    transition={{ delay: (ci + p) * 0.008, duration: 0.2 }}
                    type="button"
                  >
                    {Math.round(pct)}
                  </motion.button>
                );
              })}
            </Fragment>
          ))}

          <div className="px-1 py-0.5 font-medium font-sans text-muted-foreground">Avg</div>
          {averages.map((avg, p) =>
            avg === null ? (
              <div key={`avg-${p}`} />
            ) : (
              <div
                className="flex aspect-square min-h-6 items-center justify-center rounded-[2px] font-medium text-[10px] tabular-nums"
                key={`avg-${p}`}
                style={{ background: intensityColor(avg), color: textColor(avg) }}
              >
                {Math.round(avg)}
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-2 font-sans text-[11px] text-muted-foreground">
        {hoverInfo ? (
          <span>
            <span className="font-medium text-foreground">{hoverInfo.cohort}</span> ·{" "}
            {hoverInfo.period} ·{" "}
            {hoverInfo.count !== undefined ? `${hoverInfo.count}/${hoverInfo.size} · ` : ""}
            {hoverInfo.percent}%
          </span>
        ) : (
          <span>Hover a cell for detail</span>
        )}
      </div>
    </div>
  );
}

export default CohortHeatmap;
