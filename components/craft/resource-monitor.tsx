"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ResourceMetric {
  id: string;
  label: string;
  value: number;
  max?: number;
  unit?: string;
  warn?: number;
  critical?: number;
  history?: number[];
}

export interface ResourceMonitorProps {
  metrics: ResourceMetric[];
  live?: boolean;
  intervalMs?: number;
  className?: string;
}

type Status = "ok" | "warn" | "critical";

const HISTORY_CAP = 32;
const GAUGE_START = -135;
const GAUGE_END = 135;

const STATUS_META: Record<Status, { color: string; label: string }> = {
  critical: { color: "#ef4444", label: "critical" },
  ok: { color: "#10b981", label: "ok" },
  warn: { color: "#f59e0b", label: "warn" },
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function thresholds(m: ResourceMetric): { max: number; warn: number; crit: number } {
  const max = m.max ?? 100;
  return { crit: m.critical ?? max * 0.9, max, warn: m.warn ?? max * 0.7 };
}

function statusOf(value: number, warn: number, crit: number): Status {
  if (value >= crit) return "critical";
  if (value >= warn) return "warn";
  return "ok";
}

function worstStatus(statuses: Status[]): Status {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warn")) return "warn";
  return "ok";
}

function pointOnArc(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = pointOnArc(cx, cy, r, startDeg);
  const e = pointOnArc(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function degForFrac(frac: number): number {
  return GAUGE_START + clamp(frac, 0, 1) * (GAUGE_END - GAUGE_START);
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function Gauge({
  value,
  max,
  warn,
  crit,
  unit,
  color,
}: {
  value: number;
  max: number;
  warn: number;
  crit: number;
  unit: string;
  color: string;
}) {
  const cx = 50;
  const cy = 46;
  const r = 38;
  const warnDeg = degForFrac(warn / max);
  const critDeg = degForFrac(crit / max);
  const frac = clamp(value / max, 0, 1);
  return (
    <svg className="w-full" style={{ maxWidth: 128 }} viewBox="0 0 100 80">
      <path
        d={arc(cx, cy, r, GAUGE_START, warnDeg)}
        fill="none"
        stroke="#10b981"
        strokeLinecap="round"
        strokeOpacity={0.25}
        strokeWidth={7}
      />
      <path
        d={arc(cx, cy, r, warnDeg, critDeg)}
        fill="none"
        stroke="#f59e0b"
        strokeOpacity={0.25}
        strokeWidth={7}
      />
      <path
        d={arc(cx, cy, r, critDeg, GAUGE_END)}
        fill="none"
        stroke="#ef4444"
        strokeLinecap="round"
        strokeOpacity={0.25}
        strokeWidth={7}
      />
      <path
        d={arc(cx, cy, r, GAUGE_START, GAUGE_END)}
        fill="none"
        pathLength={100}
        stroke={color}
        strokeDasharray={100}
        strokeDashoffset={100 - frac * 100}
        strokeLinecap="round"
        strokeWidth={7}
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
      />
      <text
        className="fill-foreground font-bold"
        style={{ fontSize: 18 }}
        textAnchor="middle"
        x={cx}
        y={cy + 2}
      >
        {Math.round(value)}
      </text>
      <text
        className="fill-muted-foreground"
        style={{ fontSize: 8 }}
        textAnchor="middle"
        x={cx}
        y={cy + 13}
      >
        {unit}
      </text>
    </svg>
  );
}

function Sparkline({ history, max, color }: { history: number[]; max: number; color: string }) {
  const w = 120;
  const h = 22;
  if (history.length < 2) return <div className="h-[22px]" />;
  const n = history.length;
  const avg = history.reduce((a, b) => a + b, 0) / n;
  const peak = Math.max(...history);
  const peakIdx = history.indexOf(peak);
  const pts = history
    .map((v, i) => `${(i / (n - 1)) * w},${h - clamp(v / max, 0, 1) * h}`)
    .join(" ");
  const avgY = h - clamp(avg / max, 0, 1) * h;
  const px = (peakIdx / (n - 1)) * w;
  const py = h - clamp(peak / max, 0, 1) * h;
  return (
    <svg
      aria-hidden="true"
      className="w-full text-muted-foreground"
      preserveAspectRatio="none"
      style={{ height: 22 }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <line
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeOpacity={0.4}
        vectorEffect="non-scaling-stroke"
        x1={0}
        x2={w}
        y1={avgY}
        y2={avgY}
      />
      <polyline
        fill="none"
        points={pts}
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={px} cy={py} fill={color} r={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ResourceMonitor({
  metrics,
  live = true,
  intervalMs = 1500,
  className,
}: ResourceMonitorProps) {
  const mounted = useMounted();
  const [running, setRunning] = useState(live);
  const [data, setData] = useState<Map<string, { value: number; history: number[] }>>(() => {
    const m = new Map<string, { value: number; history: number[] }>();
    for (const met of metrics)
      m.set(met.id, { history: met.history ?? [met.value], value: met.value });
    return m;
  });

  useEffect(() => {
    setData((prev) => {
      const next = new Map<string, { value: number; history: number[] }>();
      for (const met of metrics) {
        next.set(
          met.id,
          prev.get(met.id) ?? { history: met.history ?? [met.value], value: met.value },
        );
      }
      return next;
    });
  }, [metrics]);

  useEffect(() => {
    if (!mounted || !live || !running) return;
    const id = setInterval(() => {
      setData((prev) => {
        const next = new Map(prev);
        for (const met of metrics) {
          const cur = next.get(met.id);
          if (!cur) continue;
          const { max } = thresholds(met);
          const delta = (Math.random() - 0.5) * max * 0.12;
          const pull = (met.value - cur.value) * 0.06;
          const value = clamp(cur.value + delta + pull, 0, max);
          const history = [...cur.history, value].slice(-HISTORY_CAP);
          next.set(met.id, { history, value });
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [mounted, live, running, intervalMs, metrics]);

  if (metrics.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No metrics
      </div>
    );
  }

  const items = metrics.map((met) => {
    const d = data.get(met.id) ?? { history: met.history ?? [met.value], value: met.value };
    const { max, warn, crit } = thresholds(met);
    const status = statusOf(d.value, warn, crit);
    return {
      crit,
      history: d.history,
      max,
      metric: met,
      status,
      unit: met.unit ?? "%",
      value: d.value,
      warn,
    };
  });

  const worst = worstStatus(items.map((i) => i.status));
  const warnCount = items.filter((i) => i.status === "warn").length;
  const critCount = items.filter((i) => i.status === "critical").length;
  const bannerColor = STATUS_META[worst].color;
  const bannerText =
    worst === "ok"
      ? "All healthy"
      : [
          critCount > 0 ? `${critCount} critical` : null,
          warnCount > 0 ? `${warnCount} warning` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2 font-sans">
        <span
          className="flex items-center gap-1.5 font-medium text-sm"
          style={{ color: bannerColor }}
        >
          <span className="size-2 rounded-full" style={{ background: bannerColor }} />
          {bannerText}
        </span>
        <button
          className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setRunning((r) => !r)}
          type="button"
        >
          {running ? <Pause className="size-3" /> : <Play className="size-3" />}
          {running ? "Pause" : "Play"}
          {live && running && mounted ? (
            <span className="ml-1 flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              {intervalMs / 1000}s
            </span>
          ) : null}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it) => {
          const color = STATUS_META[it.status].color;
          const peak = it.history.length > 0 ? Math.max(...it.history) : it.value;
          return (
            <div
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-2"
              key={it.metric.id}
            >
              <Gauge
                color={color}
                crit={it.crit}
                max={it.max}
                unit={it.unit}
                value={it.value}
                warn={it.warn}
              />
              <span className="font-medium">{it.metric.label}</span>
              <div className="w-full">
                <Sparkline color={color} history={it.history} max={it.max} />
                <div className="text-center text-[10px] text-muted-foreground">
                  peak {Math.round(peak)}
                  {it.unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResourceMonitor;
