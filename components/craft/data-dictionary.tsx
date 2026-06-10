"use client";

import { ChevronRight, Search, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface DictionaryColumn {
  name: string;
  type: string;
  table: string;
  description?: string;
  tags?: string[];
  pii?: boolean;
  nullable?: boolean;
  sample?: string[];
}

export interface DataDictionaryProps {
  columns: DictionaryColumn[];
  className?: string;
}

function keyOf(c: DictionaryColumn): string {
  return `${c.table}.${c.name}`;
}

function matches(c: DictionaryColumn, q: string): boolean {
  const n = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(n) ||
    c.table.toLowerCase().includes(n) ||
    (c.description?.toLowerCase().includes(n) ?? false)
  );
}

function Highlighted({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded-sm bg-amber-500/30">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
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

export function DataDictionary({ columns, className }: DataDictionaryProps) {
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<Set<string>>(() => new Set());
  const [piiOnly, setPiiOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const tables = useMemo(() => {
    const t: string[] = [];
    for (const c of columns) {
      if (!t.includes(c.table)) t.push(c.table);
    }
    return t;
  }, [columns]);

  const piiCount = columns.filter((c) => c.pii).length;
  const q = query.trim();

  const visible = columns.filter(
    (c) =>
      (q === "" || matches(c, q)) &&
      (tableFilter.size === 0 || tableFilter.has(c.table)) &&
      (!piiOnly || c.pii === true),
  );

  const toggleTable = (t: string) =>
    setTableFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const toggleExpand = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="text-[11px] text-muted-foreground">
          {columns.length} columns · {tables.length} tables · {piiCount} PII
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-7 w-40 rounded-md border border-border bg-background pr-2 pl-7 text-xs outline-none focus:border-foreground/30"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns…"
              value={query}
            />
          </div>
          {tables.map((t) => {
            const on = tableFilter.has(t);
            return (
              <button
                className={cn(
                  "rounded-full border px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                  on
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                key={t}
                onClick={() => toggleTable(t)}
                type="button"
              >
                {t}
              </button>
            );
          })}
          <button
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
              piiOnly
                ? "border-amber-500/50 text-amber-500"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setPiiOnly((v) => !v)}
            type="button"
          >
            <ShieldAlert className="size-3" />
            PII
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-3 py-6 text-center text-muted-foreground italic">No columns match</p>
      ) : (
        <div className="divide-y divide-border/60">
          {visible.map((c) => {
            const k = keyOf(c);
            const isOpen = expanded.has(k);
            return (
              <div key={k}>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                  onClick={() => toggleExpand(k)}
                  type="button"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <span className="truncate font-medium font-mono">
                    <Highlighted q={q} text={c.name} />
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {c.type}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <Badge mono>
                      <Highlighted q={q} text={c.table} />
                    </Badge>
                    {c.tags?.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                    {c.pii ? (
                      <span className="flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-px font-medium text-[10px] text-amber-500">
                        <ShieldAlert className="size-2.5" />
                        PII
                      </span>
                    ) : null}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="space-y-1.5 px-3 pb-2.5 pl-8">
                        {c.description ? (
                          <p className="text-muted-foreground leading-5">
                            <Highlighted q={q} text={c.description} />
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.nullable !== undefined ? (
                            <Badge>{c.nullable ? "nullable" : "not null"}</Badge>
                          ) : null}
                          {c.sample && c.sample.length > 0 ? (
                            <>
                              <span className="text-[10px] text-muted-foreground">Sample:</span>
                              {c.sample.map((s) => (
                                <Badge key={s} mono>
                                  {s}
                                </Badge>
                              ))}
                            </>
                          ) : null}
                        </div>
                        {!c.description &&
                        c.nullable === undefined &&
                        (!c.sample || c.sample.length === 0) ? (
                          <p className="text-muted-foreground italic">No additional metadata</p>
                        ) : null}
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

export default DataDictionary;
