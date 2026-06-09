"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface Percentile {
  label: string;
  value: number;
}

export interface LatencyHistogramProps {
  samples?: number[];
  bins?: HistogramBin[];
  percentiles?: Percentile[];
  bucketCount?: number;
  unit?: string;
  height?: number;
  className?: string;
}

interface Stats {
  min: number;
  median: number;
  p95: number;
  p99: number;
  max: number;
}

const ZONE_NORMAL = "#3b82f6";
const ZONE_WARN = "#f59e0b";
const ZONE_CRIT = "#ef4444";

function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[idx];
}

function computeBins(samples: number[], bucketCount: number): HistogramBin[] {
  if (samples.length === 0) return [];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of samples) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  if (min === max) max = min + 1;
  const n = Math.max(1, bucketCount);
  const width = (max - min) / n;
  const bins: HistogramBin[] = [];
  for (let i = 0; i < n; i++) {
    bins.push({ count: 0, from: min + i * width, to: min + (i + 1) * width });
  }
  for (const s of samples) {
    let idx = Math.floor((s - min) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

function computePercentiles(samples: number[]): Percentile[] {
  const sorted = [...samples].sort((a, b) => a - b);
  return [
    { label: "p50", value: quantileSorted(sorted, 50) },
    { label: "p95", value: quantileSorted(sorted, 95) },
    { label: "p99", value: quantileSorted(sorted, 99) },
  ];
}

function summaryFromSamples(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    max: sorted[sorted.length - 1],
    median: quantileSorted(sorted, 50),
    min: sorted[0],
    p95: quantileSorted(sorted, 95),
    p99: quantileSorted(sorted, 99),
  };
}

function quantileFromBins(bins: HistogramBin[], p: number): number {
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total === 0) return 0;
  const target = (p / 100) * total;
  let cum = 0;
  for (const b of bins) {
    cum += b.count;
    if (cum >= target) return (b.from + b.to) / 2;
  }
  const last = bins[bins.length - 1];
  return last ? (last.from + last.to) / 2 : 0;
}

function summaryFromBins(bins: HistogramBin[]): Stats {
  return {
    max: bins.length ? bins[bins.length - 1].to : 0,
    median: quantileFromBins(bins, 50),
    min: bins.length ? bins[0].from : 0,
    p95: quantileFromBins(bins, 95),
    p99: quantileFromBins(bins, 99),
  };
}

function fmt(n: number, unit: string): string {
  const r = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${r}${unit}`;
}

function zoneColor(mid: number, p95: number | undefined, p99: number | undefined): string {
  if (p99 !== undefined && mid >= p99) return ZONE_CRIT;
  if (p95 !== undefined && mid >= p95) return ZONE_WARN;
  return ZONE_NORMAL;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </span>
  );
}

export function LatencyHistogram({
  samples,
  bins,
  percentiles,
  bucketCount = 24,
  unit = "",
  height = 180,
  className,
}: LatencyHistogramProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const data = useMemo(() => {
    if (samples && samples.length > 0) {
      return {
        histBins: computeBins(samples, bucketCount),
        pcts: percentiles ?? computePercentiles(samples),
        stats: summaryFromSamples(samples),
      };
    }
    if (bins && bins.length > 0) {
      return { histBins: bins, pcts: percentiles ?? [], stats: summaryFromBins(bins) };
    }
    return null;
  }, [samples, bins, percentiles, bucketCount]);

  if (!data) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No data
      </div>
    );
  }

  const { histBins, pcts, stats } = data;
  const min = histBins[0].from;
  const max = histBins[histBins.length - 1].to;
  const span = max - min || 1;
  const maxCount = histBins.reduce((m, b) => Math.max(m, b.count), 0);
  const total = histBins.reduce((s, b) => s + b.count, 0);
  const p95 = pcts.find((p) => p.label === "p95")?.value;
  const p99 = pcts.find((p) => p.label === "p99")?.value;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Stat label="min" value={fmt(stats.min, unit)} />
        <Stat label="median" value={fmt(stats.median, unit)} />
        <Stat accent={ZONE_WARN} label="p95" value={fmt(stats.p95, unit)} />
        <Stat accent={ZONE_CRIT} label="p99" value={fmt(stats.p99, unit)} />
        <Stat label="max" value={fmt(stats.max, unit)} />
      </div>

      <div className="relative" style={{ height }}>
        {pcts.map((p) => {
          const x = ((p.value - min) / span) * 100;
          if (x < 0 || x > 100) return null;
          return (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10"
              key={p.label}
              style={{ left: `${x}%` }}
            >
              <div className="h-full border-foreground/40 border-l border-dashed" />
              <span className="absolute top-0 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-background/80 px-1 text-[9px] text-muted-foreground">
                {p.label} {fmt(p.value, unit)}
              </span>
            </div>
          );
        })}

        <div className="flex h-full items-end gap-px">
          {histBins.map((b, i) => {
            const h = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
            const mid = (b.from + b.to) / 2;
            return (
              <motion.div
                animate={{ height: `${h}%` }}
                className={cn(
                  "flex-1 rounded-t-sm transition-opacity",
                  hovered !== null && hovered !== i && "opacity-50",
                )}
                initial={{ height: 0 }}
                key={`${b.from}-${b.to}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((x) => (x === i ? null : x))}
                style={{ background: zoneColor(mid, p95, p99) }}
                transition={{ delay: i * 0.01, duration: 0.4 }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{fmt(min, unit)}</span>
        <span>{fmt((min + max) / 2, unit)}</span>
        <span>{fmt(max, unit)}</span>
      </div>

      <div className="mt-1 text-[11px] text-muted-foreground">
        {hovered !== null && histBins[hovered] ? (
          <span className="tabular-nums">
            {fmt(histBins[hovered].from, unit)}–{fmt(histBins[hovered].to, unit)} ·{" "}
            {histBins[hovered].count} (
            {total > 0 ? ((histBins[hovered].count / total) * 100).toFixed(1) : "0"}%)
          </span>
        ) : (
          <span>Hover a bar · {total} samples</span>
        )}
      </div>
    </div>
  );
}

export default LatencyHistogram;
