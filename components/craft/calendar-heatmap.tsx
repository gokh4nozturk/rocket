"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface HeatmapDay {
  date: string;
  value: number;
}

export interface CalendarHeatmapProps {
  data: HeatmapDay[];
  unit?: string;
  weekStartsOn?: 0 | 1;
  className?: string;
}

interface GridDay {
  date: number;
  value: number;
  level: number;
  row: number;
}

interface GridColumn {
  col: number;
  monthLabel: string | null;
  days: GridDay[];
}

interface Grid {
  columns: GridColumn[];
  max: number;
  total: number;
  activeDays: number;
  weekdayLabels: string[];
}

const DAY_MS = 86_400_000;
const CELL = 11;
const GAP = 3;

const LEVEL_BG = [
  "rgba(128, 128, 128, 0.16)",
  "rgba(16, 185, 129, 0.3)",
  "rgba(16, 185, 129, 0.5)",
  "rgba(16, 185, 129, 0.72)",
  "rgba(16, 185, 129, 1)",
];

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const WD_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });

function parseUTC(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

function weekdayUTC(epoch: number): number {
  return new Date(epoch).getUTCDay();
}

function levelOf(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDay(epoch: number): string {
  return DAY_FMT.format(new Date(epoch));
}

function buildGrid(data: HeatmapDay[], weekStartsOn: 0 | 1): Grid | null {
  const valueByEpoch = new Map<number, number>();
  for (const d of data) {
    const e = parseUTC(d.date);
    if (e === null) continue;
    valueByEpoch.set(e, (valueByEpoch.get(e) ?? 0) + d.value);
  }
  if (valueByEpoch.size === 0) return null;

  const epochs = [...valueByEpoch.keys()].sort((a, b) => a - b);
  const minE = epochs[0];
  const maxE = epochs[epochs.length - 1];
  const minWd = (weekdayUTC(minE) - weekStartsOn + 7) % 7;
  const gridStart = minE - minWd * DAY_MS;

  let max = 0;
  let total = 0;
  let activeDays = 0;
  for (const v of valueByEpoch.values()) {
    if (v > max) max = v;
    total += v;
    if (v > 0) activeDays++;
  }

  const colMap = new Map<number, GridColumn>();
  for (let e = gridStart; e <= maxE; e += DAY_MS) {
    const col = Math.floor((e - gridStart) / (7 * DAY_MS));
    const row = (weekdayUTC(e) - weekStartsOn + 7) % 7;
    const inRange = e >= minE && e <= maxE;
    const value = inRange ? (valueByEpoch.get(e) ?? 0) : -1;
    let column = colMap.get(col);
    if (!column) {
      column = { col, days: [], monthLabel: null };
      colMap.set(col, column);
    }
    column.days.push({ date: e, level: value < 0 ? -1 : levelOf(value, max), row, value });
  }

  const columns = [...colMap.values()].sort((a, b) => a.col - b.col);
  let prevMonth = -1;
  for (const column of columns) {
    const firstDay = column.days.find((d) => d.value >= 0) ?? column.days[0];
    const month = new Date(firstDay.date).getUTCMonth();
    if (month !== prevMonth) {
      column.monthLabel = MONTH_FMT.format(new Date(firstDay.date));
      prevMonth = month;
    }
  }

  const base = Date.UTC(2023, 0, 1 + weekStartsOn);
  const weekdayLabels: string[] = [];
  for (let r = 0; r < 7; r++) weekdayLabels.push(WD_FMT.format(new Date(base + r * DAY_MS)));

  return { activeDays, columns, max, total, weekdayLabels };
}

export function CalendarHeatmap({ data, unit, weekStartsOn = 0, className }: CalendarHeatmapProps) {
  const [hovered, setHovered] = useState<{ date: number; value: number } | null>(null);
  const grid = buildGrid(data, weekStartsOn);

  if (!grid) {
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

  const unitStr = unit ? ` ${unit}` : "";

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 text-xs", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          Σ {fmtCount(grid.total)}
          {unitStr}
          <span className="ml-1.5 text-muted-foreground">· {grid.activeDays} active days</span>
        </span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Less
          {LEVEL_BG.map((bg, i) => (
            <span
              className="rounded-[2px]"
              key={i}
              style={{ background: bg, height: CELL, width: CELL }}
            />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1.5 text-[9px]">
          <div className="flex flex-col" style={{ gap: GAP, paddingTop: 16 }}>
            {grid.weekdayLabels.map((wd, r) => (
              <div
                className="text-muted-foreground"
                key={r}
                style={{ height: CELL, lineHeight: `${CELL}px` }}
              >
                {r % 2 === 1 ? wd : ""}
              </div>
            ))}
          </div>

          <div>
            <div className="mb-[3px] flex" style={{ gap: GAP }}>
              {grid.columns.map((c) => (
                <div
                  className="whitespace-nowrap text-muted-foreground"
                  key={c.col}
                  style={{ height: 13, width: CELL }}
                >
                  {c.monthLabel ?? ""}
                </div>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {grid.columns.map((c) => (
                <div className="flex flex-col" key={c.col} style={{ gap: GAP }}>
                  {Array.from({ length: 7 }, (_, r) => {
                    const day = c.days.find((d) => d.row === r);
                    if (!day || day.level < 0) {
                      return <div key={r} style={{ height: CELL, width: CELL }} />;
                    }
                    const isHover = hovered?.date === day.date;
                    return (
                      // biome-ignore lint/a11y/noStaticElementInteractions: hover drives a visual day detail
                      <div
                        className={cn("rounded-[2px]", isHover && "ring-1 ring-foreground")}
                        key={r}
                        onMouseEnter={() => setHovered({ date: day.date, value: day.value })}
                        onMouseLeave={() => setHovered(null)}
                        style={{ background: LEVEL_BG[day.level], height: CELL, width: CELL }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        {hovered ? (
          <span>
            <span className="font-medium text-foreground">{fmtDay(hovered.date)}</span> ·{" "}
            {fmtCount(hovered.value)}
            {unitStr}
          </span>
        ) : (
          "Hover a day for detail"
        )}
      </div>
    </div>
  );
}

export default CalendarHeatmap;
