"use client";

import { ArrowDown, ChevronRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  time: string | number | Date;
  level: LogLevel;
  message: string;
  detail?: unknown;
}

export interface LogStreamProps {
  entries: LogEntry[];
  defaultLevels?: LogLevel[];
  searchable?: boolean;
  autoScroll?: boolean;
  height?: number;
  className?: string;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

const LEVEL_BADGE: Record<LogLevel, string> = {
  debug: "bg-muted text-muted-foreground",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const LEVEL_BAR: Record<LogLevel, string> = {
  debug: "bg-muted-foreground/30",
  error: "bg-red-500",
  info: "bg-blue-500",
  warn: "bg-amber-500",
};

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(time: string | number | Date): string {
  const d = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function levelCounts(entries: LogEntry[]): Record<LogLevel, number> {
  const c: Record<LogLevel, number> = { debug: 0, error: 0, info: 0, warn: 0 };
  for (const e of entries) c[e.level]++;
  return c;
}

function detailText(detail: unknown): string {
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(q);
  let n = 0;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        className="rounded bg-yellow-300/50 text-foreground dark:bg-yellow-500/30"
        key={`m${n}`}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    n++;
    i = idx + q.length;
    idx = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

function LogRow({
  entry,
  query,
  expanded,
  onToggle,
  mounted,
}: {
  entry: LogEntry;
  query: string;
  expanded: boolean;
  onToggle: () => void;
  mounted: boolean;
}) {
  const hasDetail = entry.detail !== undefined;
  const inner = (
    <>
      <span className={cn("mt-1 h-3 w-0.5 shrink-0 rounded", LEVEL_BAR[entry.level])} />
      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums leading-5">
        {mounted ? formatTime(entry.time) : "··:··:··"}
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1 font-medium text-[10px] uppercase leading-5",
          LEVEL_BADGE[entry.level],
        )}
      >
        {entry.level}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-words leading-5">
        <Highlight query={query} text={entry.message} />
      </span>
      {hasDetail ? (
        <ChevronRight
          className={cn(
            "mt-1 size-3 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      ) : null}
    </>
  );

  return (
    <div className="group/log">
      {hasDetail ? (
        <button
          className="flex w-full items-start gap-2 px-2 py-0.5 text-left hover:bg-muted/40"
          onClick={onToggle}
          type="button"
        >
          {inner}
        </button>
      ) : (
        <div className="flex items-start gap-2 px-2 py-0.5">{inner}</div>
      )}
      <AnimatePresence initial={false}>
        {expanded && hasDetail ? (
          <motion.pre
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-x-auto bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {detailText(entry.detail)}
          </motion.pre>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function LogStream({
  entries,
  defaultLevels = LEVELS,
  searchable = true,
  autoScroll = true,
  height = 320,
  className,
}: LogStreamProps) {
  const mounted = useMounted();
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(() => new Set(defaultLevels));
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [newCount, setNewCount] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevLenRef = useRef(entries.length);

  const counts = useMemo(() => levelCounts(entries), [entries]);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      entries.filter(
        (e) => activeLevels.has(e.level) && (q === "" || e.message.toLowerCase().includes(q)),
      ),
    [entries, activeLevels, q],
  );

  const scrollToBottom = (smooth: boolean) => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ behavior: smooth ? "smooth" : "auto", top: el.scrollHeight });
  };

  // Pin to bottom on first mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // On new entries: auto-scroll if pinned to bottom, else bump the new-count.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const prev = prevLenRef.current;
    const curr = entries.length;
    prevLenRef.current = curr;
    if (curr <= prev) return;
    if (autoScroll && atBottomRef.current) scrollToBottom(false);
    else setNewCount((c) => c + (curr - prev));
  }, [entries.length, autoScroll]);

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    atBottomRef.current = atBottom;
    if (atBottom) setNewCount(0);
  };

  const toggleLevel = (level: LogLevel) =>
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const jumpToBottom = () => {
    scrollToBottom(true);
    setNewCount(0);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card font-mono text-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-border border-b px-2 py-1.5 font-sans">
        {LEVELS.map((level) => (
          <button
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors",
              activeLevels.has(level)
                ? LEVEL_BADGE[level]
                : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
            key={level}
            onClick={() => toggleLevel(level)}
            type="button"
          >
            <span className="uppercase">{level}</span>
            <span className="tabular-nums opacity-70">{counts[level]}</span>
          </button>
        ))}
        {searchable ? (
          <div className="relative ml-auto">
            <Search className="absolute top-1.5 left-2 size-3 text-muted-foreground" />
            <input
              className="h-6 w-32 rounded border border-border bg-transparent pl-6 text-xs outline-none focus:border-ring"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              value={query}
            />
          </div>
        ) : null}
      </div>

      <div className="relative">
        <div className="overflow-y-auto" onScroll={onScroll} ref={viewportRef} style={{ height }}>
          {visible.length === 0 ? (
            <p className="px-3 py-4 text-center font-sans text-muted-foreground text-xs italic">
              No logs
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((entry) => (
                <motion.div
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  key={entry.id}
                  layout
                  transition={{ duration: 0.15 }}
                >
                  <LogRow
                    entry={entry}
                    expanded={expanded.has(entry.id)}
                    mounted={mounted}
                    onToggle={() => toggleExpand(entry.id)}
                    query={q}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        <AnimatePresence>
          {newCount > 0 ? (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-2.5 py-1 font-medium font-sans text-[11px] text-background shadow"
              exit={{ opacity: 0, y: 6 }}
              initial={{ opacity: 0, y: 6 }}
              onClick={jumpToBottom}
              type="button"
            >
              {newCount} new <ArrowDown className="size-3" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default LogStream;
