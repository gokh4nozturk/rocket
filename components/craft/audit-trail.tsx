"use client";

import { ChevronRight, type LucideIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AuditAction = "created" | "updated" | "deleted";

export interface FieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditActor {
  name: string;
  avatarUrl?: string;
}

export interface AuditEntry {
  id: string;
  actor: AuditActor;
  action: AuditAction;
  target: string;
  time: string | number | Date;
  changes?: FieldChange[];
}

export interface AuditTrailProps {
  entries: AuditEntry[];
  defaultExpanded?: boolean;
  groupByDate?: boolean;
  filterable?: boolean;
  className?: string;
}

const ACTION_META: Record<AuditAction, { color: string; verb: string; Icon: LucideIcon }> = {
  created: { color: "#10b981", Icon: Plus, verb: "created" },
  deleted: { color: "#ef4444", Icon: Trash2, verb: "deleted" },
  updated: { color: "#3b82f6", Icon: Pencil, verb: "updated" },
};

const ACTIONS: AuditAction[] = ["created", "updated", "deleted"];

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function dayLabelFromKey(key: string): string {
  const [y, m, dd] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "—";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[…]";
  if (typeof v === "object") return "{…}";
  return String(v);
}

function sortByTimeDesc(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const da = toDate(a.time)?.getTime() ?? 0;
    const db = toDate(b.time)?.getTime() ?? 0;
    return db - da;
  });
}

function groupByDay(entries: AuditEntry[]): { key: string; entries: AuditEntry[] }[] {
  const order: string[] = [];
  const map = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const d = toDate(e.time);
    const key = d ? dayKey(d) : "unknown";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)?.push(e);
  }
  return order.map((key) => ({ entries: map.get(key) ?? [], key }));
}

function FieldDiff({ change, action }: { change: FieldChange; action: AuditAction }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 leading-5">
      <span className="font-medium text-foreground">{change.field}</span>
      <span className="text-muted-foreground">:</span>
      {action !== "created" ? (
        <span className="text-red-600 line-through dark:text-red-400">
          {formatValue(change.before)}
        </span>
      ) : null}
      {action === "updated" ? <span className="text-muted-foreground">→</span> : null}
      {action !== "deleted" ? (
        <span className="text-emerald-600 dark:text-emerald-400">{formatValue(change.after)}</span>
      ) : null}
    </div>
  );
}

function AuditEntryRow({
  entry,
  mounted,
  expanded,
  onToggle,
}: {
  entry: AuditEntry;
  mounted: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = ACTION_META[entry.action];
  const changeCount = entry.changes?.length ?? 0;
  return (
    <div className="flex gap-2.5 px-3 py-2.5">
      <Avatar className="size-7 shrink-0">
        {entry.actor.avatarUrl ? (
          <AvatarImage alt={entry.actor.name} src={entry.actor.avatarUrl} />
        ) : null}
        <AvatarFallback className="text-[10px]">{initials(entry.actor.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 leading-5">
            <meta.Icon
              className="mr-1 inline size-3.5 align-[-2px]"
              style={{ color: meta.color }}
            />
            <span className="font-medium text-foreground">{entry.actor.name}</span>{" "}
            <span className="text-muted-foreground">{meta.verb}</span>{" "}
            <span className="font-medium text-foreground">{entry.target}</span>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {timeAgo(entry.time, mounted)}
          </span>
        </div>
        {changeCount > 0 ? (
          <>
            <button
              className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={onToggle}
              type="button"
            >
              <ChevronRight
                className={cn("size-3 transition-transform", expanded && "rotate-90")}
              />
              {changeCount} field{changeCount === 1 ? "" : "s"}
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mt-1.5 space-y-1 rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-[11px]">
                    {entry.changes?.map((c) => (
                      <FieldDiff action={entry.action} change={c} key={c.field} />
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function AuditTrail({
  entries,
  defaultExpanded = false,
  groupByDate = true,
  filterable = true,
  className,
}: AuditTrailProps) {
  const mounted = useMounted();
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const [actorFilter, setActorFilter] = useState<Set<string>>(() => new Set());
  const [actionFilter, setActionFilter] = useState<Set<AuditAction>>(() => new Set());

  const actors = useMemo(() => {
    const seen = new Map<string, AuditActor>();
    for (const e of entries) if (!seen.has(e.actor.name)) seen.set(e.actor.name, e.actor);
    return [...seen.values()];
  }, [entries]);

  const filtered = useMemo(() => {
    const sorted = sortByTimeDesc(entries);
    return sorted.filter(
      (e) =>
        (actorFilter.size === 0 || actorFilter.has(e.actor.name)) &&
        (actionFilter.size === 0 || actionFilter.has(e.action)),
    );
  }, [entries, actorFilter, actionFilter]);

  const groups = useMemo(
    () => (groupByDate ? groupByDay(filtered) : [{ entries: filtered, key: "all" }]),
    [filtered, groupByDate],
  );

  const isExpanded = (id: string) => (toggled.has(id) ? !defaultExpanded : defaultExpanded);
  const toggle = (id: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSet = <T,>(setter: (fn: (prev: Set<T>) => Set<T>) => void, value: T) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const now = mounted ? Date.now() : 0;
  const todayKey = mounted ? dayKey(new Date(now)) : "";
  const yesterdayKey = mounted ? dayKey(new Date(now - 86_400_000)) : "";
  const labelFor = (key: string) => {
    if (key === "all" || key === "unknown") return null;
    if (mounted && key === todayKey) return "Today";
    if (mounted && key === yesterdayKey) return "Yesterday";
    return dayLabelFromKey(key);
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card text-xs", className)}>
      {filterable ? (
        <div className="flex flex-wrap items-center gap-1.5 border-border border-b px-3 py-2">
          {actors.map((a) => {
            const on = actorFilter.has(a.name);
            return (
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                  on
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                key={a.name}
                onClick={() => toggleSet(setActorFilter, a.name)}
                type="button"
              >
                <Avatar className="size-4">
                  {a.avatarUrl ? <AvatarImage alt={a.name} src={a.avatarUrl} /> : null}
                  <AvatarFallback className="text-[8px]">{initials(a.name)}</AvatarFallback>
                </Avatar>
                {a.name}
              </button>
            );
          })}
          <span className="mx-0.5 h-3 w-px bg-border" />
          {ACTIONS.map((act) => {
            const on = actionFilter.has(act);
            return (
              <button
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[11px] capitalize transition-colors",
                  on
                    ? "border-current"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                key={act}
                onClick={() => toggleSet(setActionFilter, act)}
                style={on ? { color: ACTION_META[act].color } : undefined}
                type="button"
              >
                {act}
              </button>
            );
          })}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="px-3 py-6 text-center text-muted-foreground text-xs italic">No activity</p>
      ) : (
        groups.map((group) => (
          <div key={group.key}>
            {labelFor(group.key) ? (
              <div className="sticky top-0 border-border border-b bg-card/95 px-3 py-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide backdrop-blur">
                {labelFor(group.key)}
              </div>
            ) : null}
            <div className="divide-y divide-border/60">
              {group.entries.map((entry) => (
                <AuditEntryRow
                  entry={entry}
                  expanded={isExpanded(entry.id)}
                  key={entry.id}
                  mounted={mounted}
                  onToggle={() => toggle(entry.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AuditTrail;
