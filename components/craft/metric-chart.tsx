"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface MetricPoint {
  t: number | string | Date;
  v: number;
}

export interface MetricSeries {
  key: string;
  label: string;
  color?: string;
  points: MetricPoint[];
}

export interface MetricThreshold {
  value: number;
  label?: string;
  severity?: "warning" | "critical";
}

export interface MetricAnnotation {
  t: number | string | Date;
  label: string;
  description?: string;
}

export interface MetricChartProps {
  series: MetricSeries[];
  thresholds?: MetricThreshold[];
  annotations?: MetricAnnotation[];
  unit?: string;
  height?: number;
  shadeBreaches?: boolean;
  className?: string;
}

const PALETTE = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const SEVERITY_COLOR: Record<"warning" | "critical", string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
};

function palette(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function toMs(t: number | string | Date): number {
  if (t instanceof Date) return t.getTime();
  if (typeof t === "number") return t;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(t: number): string {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Row = { t: number } & Record<string, number | undefined>;

function mergeSeries(series: MetricSeries[]): Row[] {
  const map = new Map<number, Row>();
  for (const s of series) {
    for (const p of s.points) {
      const ts = toMs(p.t);
      let row = map.get(ts);
      if (!row) {
        row = { t: ts };
        map.set(ts, row);
      }
      row[s.key] = p.v;
    }
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

export function MetricChart({
  series,
  thresholds = [],
  annotations = [],
  unit = "",
  height = 240,
  shadeBreaches,
  className,
}: MetricChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const data = useMemo(() => mergeSeries(series), [series]);
  const yMax = useMemo(() => {
    let m = 0;
    for (const s of series) for (const p of s.points) m = Math.max(m, p.v);
    for (const th of thresholds) m = Math.max(m, th.value);
    return Math.ceil(m * 1.05);
  }, [series, thresholds]);

  const shade = shadeBreaches ?? thresholds.length > 0;
  const colors = series.map((s, i) => s.color ?? palette(i));
  const showLegend = series.length > 1;

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <div style={{ height }}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ bottom: 4, left: -8, right: 16, top: 18 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="t"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={formatTime}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={[0, yMax]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v) => `${v}${unit}`}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={({ active, label, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const ts = typeof label === "number" ? label : Number(label);
                const ann = annotations.find((a) => toMs(a.t) === ts);
                return (
                  <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <div className="mb-1 font-medium text-muted-foreground">{formatTime(ts)}</div>
                    {payload.map((p) => (
                      <div className="flex items-center gap-1.5" key={String(p.dataKey)}>
                        <span className="size-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="ml-auto font-medium tabular-nums">
                          {p.value}
                          {unit}
                        </span>
                      </div>
                    ))}
                    {ann ? (
                      <div className="mt-1 border-border border-t pt-1 text-amber-600 dark:text-amber-400">
                        {ann.label}
                        {ann.description ? `: ${ann.description}` : ""}
                      </div>
                    ) : null}
                  </div>
                );
              }}
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeDasharray: "3 3",
                strokeOpacity: 0.4,
              }}
            />

            {shade
              ? thresholds.map((th) => (
                  <ReferenceArea
                    fill={SEVERITY_COLOR[th.severity ?? "warning"]}
                    fillOpacity={0.06}
                    ifOverflow="extendDomain"
                    key={`area-${th.value}`}
                    y1={th.value}
                    y2={yMax}
                  />
                ))
              : null}

            {thresholds.map((th) => (
              <ReferenceLine
                key={`th-${th.value}`}
                label={{
                  fill: SEVERITY_COLOR[th.severity ?? "warning"],
                  fontSize: 10,
                  position: "right",
                  value: th.label ?? `${th.value}${unit}`,
                }}
                stroke={SEVERITY_COLOR[th.severity ?? "warning"]}
                strokeDasharray="4 3"
                y={th.value}
              />
            ))}

            {annotations.map((a) => (
              <ReferenceLine
                key={`an-${toMs(a.t)}`}
                label={{
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  position: "insideTopRight",
                  value: a.label,
                }}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                x={toMs(a.t)}
              />
            ))}

            {series.map((s, i) => (
              <Line
                connectNulls
                dataKey={s.key}
                dot={false}
                hide={hidden.has(s.key)}
                key={s.key}
                name={s.label}
                stroke={colors[i]}
                strokeWidth={1.5}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showLegend ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
          {series.map((s, i) => {
            const off = hidden.has(s.key);
            return (
              <button
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-opacity",
                  off && "opacity-40",
                )}
                key={s.key}
                onClick={() => toggle(s.key)}
                type="button"
              >
                <span className="size-2.5 rounded-full" style={{ background: colors[i] }} />
                <span className={cn(off && "line-through")}>{s.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default MetricChart;
