"use client";

import { ChevronRight, CircleCheck, CircleX, type LucideIcon, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckKind =
  | "not_null"
  | "unique"
  | "freshness"
  | "range"
  | "accepted_values"
  | "row_count"
  | "custom";

export interface QualityCheck {
  id: string;
  name: string;
  kind?: CheckKind;
  column?: string;
  status: CheckStatus;
  value?: number | string;
  threshold?: number | string;
  message?: string;
}

export interface DataQualityProps {
  dataset?: string;
  rows?: number;
  checks: QualityCheck[];
  className?: string;
}

const STATUS_META: Record<
  CheckStatus,
  { color: string; label: string; Icon: LucideIcon; rank: number }
> = {
  fail: { color: "#ef4444", Icon: CircleX, label: "Failed", rank: 2 },
  pass: { color: "#10b981", Icon: CircleCheck, label: "Passed", rank: 0 },
  warn: { color: "#f59e0b", Icon: TriangleAlert, label: "Warning", rank: 1 },
};

const STATUS_ORDER: CheckStatus[] = ["fail", "warn", "pass"];

const KIND_LABEL: Record<CheckKind, string> = {
  accepted_values: "accepted values",
  custom: "custom",
  freshness: "freshness",
  not_null: "not null",
  range: "range",
  row_count: "row count",
  unique: "unique",
};

function sortChecks(checks: QualityCheck[]): QualityCheck[] {
  return [...checks].sort((a, b) => {
    const r = STATUS_META[b.status].rank - STATUS_META[a.status].rank;
    if (r !== 0) return r;
    const ca = a.column ?? "￿";
    const cb = b.column ?? "￿";
    if (ca !== cb) return ca.localeCompare(cb);
    return a.name.localeCompare(b.name);
  });
}

function summarize(checks: QualityCheck[]): {
  passed: number;
  warn: number;
  failed: number;
  total: number;
  passRate: number;
} {
  let passed = 0;
  let warn = 0;
  let failed = 0;
  for (const c of checks) {
    if (c.status === "pass") passed++;
    else if (c.status === "warn") warn++;
    else failed++;
  }
  const total = checks.length;
  return { failed, passed, passRate: total ? passed / total : 1, total, warn };
}

function worstStatus(checks: QualityCheck[]): CheckStatus {
  let worst: CheckStatus = "pass";
  for (const c of checks) {
    if (STATUS_META[c.status].rank > STATUS_META[worst].rank) worst = c.status;
  }
  return worst;
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function Badge({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground",
        mono && "font-mono",
      )}
    >
      {children}
    </span>
  );
}

export function DataQuality({ dataset, rows, checks, className }: DataQualityProps) {
  const [filter, setFilter] = useState<Set<CheckStatus>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const sorted = useMemo(() => sortChecks(checks), [checks]);
  const summary = useMemo(() => summarize(checks), [checks]);
  const worst = useMemo(() => worstStatus(checks), [checks]);

  const toggleFilter = (s: CheckStatus) =>
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (checks.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No checks
      </div>
    );
  }

  const visible = sorted.filter((c) => filter.size === 0 || filter.has(c.status));
  const worstColor = STATUS_META[worst].color;
  const bannerText =
    worst === "pass"
      ? "All checks passed"
      : [
          summary.failed > 0 ? `${summary.failed} failed` : null,
          summary.warn > 0 ? `${summary.warn} warning` : null,
        ]
          .filter(Boolean)
          .join(" · ");
  const countOf = (s: CheckStatus) =>
    s === "fail" ? summary.failed : s === "warn" ? summary.warn : summary.passed;

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-3 py-2.5 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: worstColor }}>
            {bannerText}
          </span>
          {dataset || rows !== undefined ? (
            <span className="text-[11px] text-muted-foreground">
              {dataset}
              {dataset && rows !== undefined ? " · " : ""}
              {rows !== undefined ? `${formatRows(rows)} rows` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {summary.passed}/{summary.total} passed
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ background: worstColor, width: `${summary.passRate * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-border border-b px-3 py-2 font-sans">
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          const on = filter.has(s);
          return (
            <button
              className={cn(
                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                on ? "border-current" : "border-border text-muted-foreground hover:text-foreground",
              )}
              key={s}
              onClick={() => toggleFilter(s)}
              style={on ? { color: meta.color } : undefined}
              type="button"
            >
              {meta.label}
              <span className="tabular-nums">{countOf(s)}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="px-3 py-6 text-center text-muted-foreground italic">No checks</p>
      ) : (
        <div className="divide-y divide-border/60">
          {visible.map((c) => {
            const meta = STATUS_META[c.status];
            const hasMessage = Boolean(c.message);
            const isOpen = expanded.has(c.id);
            const inner = (
              <>
                <meta.Icon className="size-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="truncate font-medium">{c.name}</span>
                {c.kind ? <Badge>{KIND_LABEL[c.kind]}</Badge> : null}
                {c.column ? <Badge mono>{c.column}</Badge> : null}
                <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px]">
                  {c.value !== undefined ? (
                    <span style={{ color: meta.color }}>{c.value}</span>
                  ) : null}
                  {c.value !== undefined && c.threshold !== undefined ? (
                    <span className="text-muted-foreground">/</span>
                  ) : null}
                  {c.threshold !== undefined ? (
                    <span className="text-muted-foreground">{c.threshold}</span>
                  ) : null}
                </span>
              </>
            );
            return (
              <div key={c.id}>
                {hasMessage ? (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                    onClick={() => toggleExpand(c.id)}
                    type="button"
                  >
                    {inner}
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">{inner}</div>
                )}
                <AnimatePresence initial={false}>
                  {hasMessage && isOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="px-3 pb-2.5 pl-8 font-mono text-[11px] text-muted-foreground">
                        {c.message}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DataQuality;
