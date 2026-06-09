"use client";

import { Activity, FileText, Globe, type LucideIcon, Table2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SourceType = "table" | "stream" | "api" | "file";
export type SourceStatus = "fresh" | "stale" | "failed" | "running";

export interface DataSource {
  id: string;
  name: string;
  type?: SourceType;
  updatedAt: string | number | Date;
  sla: number;
  status?: "failed" | "running";
  nextRun?: string | number | Date;
  schedule?: string;
  rows?: number;
}

export interface DataFreshnessProps {
  sources: DataSource[];
  className?: string;
}

const STATUS_META: Record<SourceStatus, { color: string; label: string; rank: number }> = {
  failed: { color: "#ef4444", label: "Failed", rank: 3 },
  fresh: { color: "#10b981", label: "Fresh", rank: 0 },
  running: { color: "#3b82f6", label: "Running", rank: 1 },
  stale: { color: "#f59e0b", label: "Stale", rank: 2 },
};

const TYPE_META: Record<SourceType, { Icon: LucideIcon }> = {
  api: { Icon: Globe },
  file: { Icon: FileText },
  stream: { Icon: Activity },
  table: { Icon: Table2 },
};

const STATUS_ORDER: SourceStatus[] = ["fresh", "running", "stale", "failed"];

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relParts(secs: number): string {
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function timeAgo(value: string | number | Date, mounted: boolean): string {
  const d = toDate(value);
  if (!d || !mounted) return "";
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  return `${relParts(secs)} ago`;
}

function timeUntil(value: string | number | Date, mounted: boolean): string {
  const d = toDate(value);
  if (!d || !mounted) return "";
  const secs = Math.floor((d.getTime() - Date.now()) / 1000);
  if (secs <= 0) return "due now";
  return `in ${relParts(secs)}`;
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function freshnessOf(
  source: DataSource,
  now: number,
  mounted: boolean,
): { status: SourceStatus; slaPct: number } {
  if (source.status === "failed") return { slaPct: 100, status: "failed" };
  if (source.status === "running") return { slaPct: 100, status: "running" };
  if (!mounted) return { slaPct: 0, status: "fresh" };
  const d = toDate(source.updatedAt);
  const age = d ? Math.max(0, now - d.getTime()) : 0;
  const pct = source.sla > 0 ? clamp((age / source.sla) * 100, 0, 100) : 0;
  return { slaPct: pct, status: age <= source.sla ? "fresh" : "stale" };
}

function slaColor(pct: number, status: SourceStatus): string {
  if (status === "failed") return "#ef4444";
  if (status === "running") return "#3b82f6";
  if (status === "stale" || pct >= 100) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

function SourceRow({
  source,
  status,
  slaPct,
  mounted,
}: {
  source: DataSource;
  status: SourceStatus;
  slaPct: number;
  mounted: boolean;
}) {
  const sm = STATUS_META[status];
  const TypeIcon = TYPE_META[source.type ?? "table"].Icon;
  const barColor = slaColor(slaPct, status);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-0.5 shrink-0 self-stretch rounded" style={{ background: sm.color }} />
      <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium font-mono text-foreground">{source.name}</span>
          {source.rows !== undefined ? (
            <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground tabular-nums">
              {formatRows(source.rows)} rows
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
          {source.schedule ? <span>{source.schedule}</span> : null}
          {mounted ? <span>updated {timeAgo(source.updatedAt, mounted)}</span> : null}
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          {status === "running" ? (
            <motion.div
              animate={{ x: ["-100%", "300%"] }}
              className="h-full w-1/3 rounded-full"
              style={{ background: barColor }}
              transition={{ duration: 1.2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            />
          ) : (
            <div
              className="h-full rounded-full transition-all"
              style={{ background: barColor, width: `${slaPct}%` }}
            />
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium text-[10px]"
          style={{ background: `${sm.color}1f`, color: sm.color }}
        >
          <span className="size-1.5 rounded-full" style={{ background: sm.color }} />
          {sm.label}
        </span>
        {source.nextRun && mounted ? (
          <span className="text-[10px] text-muted-foreground">
            next run {timeUntil(source.nextRun, mounted)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DataFreshness({ sources, className }: DataFreshnessProps) {
  const mounted = useMounted();
  const now = mounted ? Date.now() : 0;

  const rows = useMemo(() => {
    const computed = sources.map((source) => ({ source, ...freshnessOf(source, now, mounted) }));
    return computed.sort((a, b) => {
      const r = STATUS_META[b.status].rank - STATUS_META[a.status].rank;
      return r !== 0 ? r : b.slaPct - a.slaPct;
    });
  }, [sources, now, mounted]);

  const { counts, worst } = useMemo(() => {
    const c: Record<SourceStatus, number> = { failed: 0, fresh: 0, running: 0, stale: 0 };
    let w: SourceStatus = "fresh";
    for (const r of rows) {
      c[r.status]++;
      if (STATUS_META[r.status].rank > STATUS_META[w].rank) w = r.status;
    }
    return { counts: c, worst: w };
  }, [rows]);

  if (sources.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No sources
      </div>
    );
  }

  const allFresh = worst === "fresh";
  const bannerColor = STATUS_META[worst].color;
  const bannerText = allFresh
    ? "All sources fresh"
    : STATUS_ORDER.filter((s) => counts[s] > 0)
        .map((s) => `${counts[s]} ${s}`)
        .join(" · ");

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div
        className="flex items-center gap-2 border-border border-b px-3 py-2.5 font-sans"
        style={{ background: `${bannerColor}14` }}
      >
        <span className="size-2.5 rounded-full" style={{ background: bannerColor }} />
        <span className="font-medium text-sm" style={{ color: bannerColor }}>
          {bannerText}
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map(({ source, status, slaPct }) => (
          <SourceRow
            key={source.id}
            mounted={mounted}
            slaPct={slaPct}
            source={source}
            status={status}
          />
        ))}
      </div>
    </div>
  );
}

export default DataFreshness;
