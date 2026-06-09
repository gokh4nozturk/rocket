"use client";

import {
  Check,
  ChevronRight,
  Info,
  type LucideIcon,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type Severity = "critical" | "warning" | "info";
export type AlertStatus = "firing" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  severity: Severity;
  status: AlertStatus;
  title: string;
  source?: string;
  description?: string;
  startedAt: string | number | Date;
}

export interface AlertFeedProps {
  alerts: Alert[];
  defaultHideResolved?: boolean;
  filterable?: boolean;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  className?: string;
}

const SEVERITY_META: Record<
  Severity,
  { color: string; label: string; Icon: LucideIcon; rank: number }
> = {
  critical: { color: "#ef4444", Icon: OctagonAlert, label: "Critical", rank: 2 },
  info: { color: "#3b82f6", Icon: Info, label: "Info", rank: 0 },
  warning: { color: "#f59e0b", Icon: TriangleAlert, label: "Warning", rank: 1 },
};

const STATUS_META: Record<AlertStatus, { color: string; label: string }> = {
  acknowledged: { color: "#3b82f6", label: "Acknowledged" },
  firing: { color: "#ef4444", label: "Firing" },
  resolved: { color: "#10b981", label: "Resolved" },
};

const SEVERITIES: Severity[] = ["critical", "warning", "info"];
const STATUSES: AlertStatus[] = ["firing", "acknowledged", "resolved"];

function statusActive(st: AlertStatus): boolean {
  return st !== "resolved";
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

function timeAgo(value: string | number | Date, mounted: boolean): string {
  const d = toDate(value);
  if (!d) return "";
  if (!mounted) return shortDate(d);
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(d);
}

function sortAlerts(alerts: Alert[], statusOf: (a: Alert) => AlertStatus): Alert[] {
  return [...alerts].sort((a, b) => {
    const aActive = statusActive(statusOf(a)) ? 0 : 1;
    const bActive = statusActive(statusOf(b)) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    const sev = SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank;
    if (sev !== 0) return sev;
    return (toDate(b.startedAt)?.getTime() ?? 0) - (toDate(a.startedAt)?.getTime() ?? 0);
  });
}

function AlertRow({
  alert,
  status,
  mounted,
  actionable,
  onAck,
  onResolve,
}: {
  alert: Alert;
  status: AlertStatus;
  mounted: boolean;
  actionable: boolean;
  onAck?: () => void;
  onResolve?: () => void;
}) {
  const sev = SEVERITY_META[alert.severity];
  const stat = STATUS_META[status];
  return (
    <div className="flex items-stretch gap-2.5 px-3 py-2.5">
      <span className="w-0.5 shrink-0 rounded" style={{ background: sev.color }} />
      <sev.Icon className="mt-0.5 size-4 shrink-0" style={{ color: sev.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 leading-5">
            <span className="font-medium text-foreground">{alert.title}</span>
            {alert.source ? (
              <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                {alert.source}
              </span>
            ) : null}
            {alert.description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-4">
                {alert.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {timeAgo(alert.startedAt, mounted)}
            </span>
            <span
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium text-[10px]"
              style={{ background: `${stat.color}1f`, color: stat.color }}
            >
              <span className="size-1.5 rounded-full" style={{ background: stat.color }} />
              {stat.label}
            </span>
          </div>
        </div>
        {actionable && status !== "resolved" ? (
          <div className="mt-1.5 flex gap-1.5">
            {status === "firing" ? (
              <button
                className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={onAck}
                type="button"
              >
                Ack
              </button>
            ) : null}
            <button
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onResolve}
              type="button"
            >
              Resolve
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AlertFeed({
  alerts,
  defaultHideResolved = true,
  filterable = true,
  onAcknowledge,
  onResolve,
  className,
}: AlertFeedProps) {
  const mounted = useMounted();
  const [overrides, setOverrides] = useState<Map<string, AlertStatus>>(() => new Map());
  const [sevFilter, setSevFilter] = useState<Set<Severity>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<Set<AlertStatus>>(() => new Set());
  const [showResolved, setShowResolved] = useState(!defaultHideResolved);

  const statusOf = (a: Alert): AlertStatus => overrides.get(a.id) ?? a.status;

  const acknowledge = (id: string) => {
    setOverrides((m) => new Map(m).set(id, "acknowledged"));
    onAcknowledge?.(id);
  };
  const resolve = (id: string) => {
    setOverrides((m) => new Map(m).set(id, "resolved"));
    onResolve?.(id);
  };

  const toggleSev = (s: Severity) =>
    setSevFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const toggleStatus = (s: AlertStatus) =>
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const derived = useMemo(() => {
    const statusFn = (a: Alert) => overrides.get(a.id) ?? a.status;
    const sorted = sortAlerts(alerts, statusFn);
    const filtered = sorted.filter(
      (a) =>
        (sevFilter.size === 0 || sevFilter.has(a.severity)) &&
        (statusFilter.size === 0 || statusFilter.has(statusFn(a))),
    );
    const active = filtered.filter((a) => statusActive(statusFn(a)));
    const resolved = filtered.filter((a) => !statusActive(statusFn(a)));
    const counts: Record<Severity, number> = { critical: 0, info: 0, warning: 0 };
    let worst: Severity | null = null;
    for (const a of alerts) {
      if (statusFn(a) === "firing") {
        counts[a.severity]++;
        if (!worst || SEVERITY_META[a.severity].rank > SEVERITY_META[worst].rank)
          worst = a.severity;
      }
    }
    return { active, counts, resolved, worst };
  }, [alerts, overrides, sevFilter, statusFilter]);

  const { active, resolved, counts, worst } = derived;
  const bannerColor = worst ? SEVERITY_META[worst].color : "#10b981";
  const bannerText = worst
    ? `${SEVERITIES.filter((s) => counts[s] > 0)
        .map((s) => `${counts[s]} ${s}`)
        .join(" · ")} firing`
    : "All clear";

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div
        className="flex items-center gap-2 border-border border-b px-3 py-2.5 font-sans"
        style={{ background: `${bannerColor}14` }}
      >
        {worst ? (
          <span className="size-2.5 rounded-full" style={{ background: bannerColor }} />
        ) : (
          <Check className="size-4" style={{ color: bannerColor }} />
        )}
        <span className="font-medium text-sm" style={{ color: bannerColor }}>
          {bannerText}
        </span>
      </div>

      {filterable ? (
        <div className="flex flex-wrap items-center gap-1.5 border-border border-b px-3 py-2 font-sans">
          {SEVERITIES.map((s) => {
            const on = sevFilter.has(s);
            return (
              <button
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[11px] capitalize transition-colors",
                  on
                    ? "border-current"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                key={s}
                onClick={() => toggleSev(s)}
                style={on ? { color: SEVERITY_META[s].color } : undefined}
                type="button"
              >
                {s}
              </button>
            );
          })}
          <span className="mx-0.5 h-3 w-px bg-border" />
          {STATUSES.map((s) => {
            const on = statusFilter.has(s);
            return (
              <button
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[11px] capitalize transition-colors",
                  on
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                key={s}
                onClick={() => toggleStatus(s)}
                type="button"
              >
                {s}
              </button>
            );
          })}
        </div>
      ) : null}

      {active.length === 0 && resolved.length === 0 ? (
        <p className="px-3 py-6 text-center text-muted-foreground text-xs italic">No alerts</p>
      ) : (
        <>
          <div className="divide-y divide-border/60">
            <AnimatePresence initial={false}>
              {active.map((a) => (
                <motion.div
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key={a.id}
                  layout
                >
                  <AlertRow
                    actionable
                    alert={a}
                    mounted={mounted}
                    onAck={() => acknowledge(a.id)}
                    onResolve={() => resolve(a.id)}
                    status={statusOf(a)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {active.length === 0 ? (
              <p className="px-3 py-4 text-center text-muted-foreground text-xs italic">
                No active alerts
              </p>
            ) : null}
          </div>

          {resolved.length > 0 ? (
            <div className="border-border border-t">
              <button
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left font-sans text-[11px] text-muted-foreground hover:bg-muted/40"
                onClick={() => setShowResolved((v) => !v)}
                type="button"
              >
                <ChevronRight
                  className={cn("size-3.5 transition-transform", showResolved && "rotate-90")}
                />
                {resolved.length} resolved
              </button>
              <AnimatePresence initial={false}>
                {showResolved ? (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="divide-y divide-border/60 opacity-70">
                      {resolved.map((a) => (
                        <AlertRow
                          actionable={false}
                          alert={a}
                          key={a.id}
                          mounted={mounted}
                          status="resolved"
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default AlertFeed;
