"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface CronBuilderProps {
  value?: string;
  onChange?: (cron: string) => void;
  className?: string;
}

type Preset = "minute" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

interface BuilderState {
  preset: Preset;
  minute: number;
  hour: number;
  dom: number;
  dows: Set<number>;
  rawFields: string[];
}

interface CronSets {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "minute", label: "Every minute" },
  { key: "hourly", label: "Hourly" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

const RAW_LABELS = ["min", "hour", "day", "month", "weekday"];
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const RUN_DAY_FMT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function parseField(expr: string, min: number, max: number): Set<number> | null {
  if (expr === "") return null;
  const out = new Set<number>();
  for (const part of expr.split(",")) {
    const m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
    if (!m) return null;
    const step = m[2] ? Number(m[2]) : 1;
    if (step < 1) return null;
    let lo = min;
    let hi = max;
    if (m[1] !== "*") {
      const [a, b] = m[1].split("-").map(Number);
      lo = a;
      hi = b ?? (m[2] ? max : a);
    }
    if (lo < min || hi > max || lo > hi) return null;
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out.size > 0 ? out : null;
}

function parseCron(cron: string): { sets: CronSets } | { error: string } {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return { error: "expected 5 fields" };
  const names = ["minute", "hour", "day-of-month", "month", "day-of-week"];
  const ranges: [number, number][] = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 7],
  ];
  const parsed: Set<number>[] = [];
  for (let i = 0; i < 5; i++) {
    const s = parseField(fields[i], ranges[i][0], ranges[i][1]);
    if (!s) return { error: `invalid ${names[i]} field` };
    parsed.push(s);
  }
  const dow = new Set<number>();
  for (const v of parsed[4]) dow.add(v === 7 ? 0 : v);
  return { sets: { dom: parsed[2], dow, hour: parsed[1], minute: parsed[0], month: parsed[3] } };
}

function isFull(s: Set<number>, min: number, max: number): boolean {
  return s.size === max - min + 1;
}

function listOf(s: Set<number>, fmt?: (n: number) => string): string {
  const arr = [...s].sort((a, b) => a - b);
  const shown = arr.slice(0, 6).map((n) => (fmt ? fmt(n) : String(n)));
  return arr.length > 6 ? `${shown.join(", ")}, …` : shown.join(", ");
}

function describe(sets: CronSets): string {
  const minFull = isFull(sets.minute, 0, 59);
  const hourFull = isFull(sets.hour, 0, 23);
  const domFull = isFull(sets.dom, 1, 31);
  const monthFull = isFull(sets.month, 1, 12);
  const dowFull = isFull(sets.dow, 0, 6);

  if (minFull && hourFull && domFull && monthFull && dowFull) return "Every minute";

  let time: string;
  const minuteOne = [...sets.minute][0];
  const hourOne = [...sets.hour][0];
  if (sets.minute.size === 1 && sets.hour.size === 1) {
    time = `At ${pad2(hourOne)}:${pad2(minuteOne)}`;
  } else if (sets.minute.size === 1 && hourFull) {
    time = `At minute ${minuteOne} past every hour`;
  } else if (minFull && sets.hour.size === 1) {
    time = `Every minute past ${pad2(hourOne)}:00`;
  } else {
    time = `At minutes ${listOf(sets.minute)}`;
    if (sets.hour.size === 1) time += ` past ${pad2(hourOne)}:00`;
    else if (!hourFull) time += ` past hours ${listOf(sets.hour)}`;
  }

  const day: string[] = [];
  if (!dowFull) day.push(`on ${listOf(sets.dow, (n) => DOW_LABELS[n])}`);
  if (!domFull) day.push(`on day ${listOf(sets.dom)}`);
  if (!monthFull) day.push(`in ${listOf(sets.month, (n) => MONTH_LABELS[n - 1])}`);
  return `${time} ${day.length > 0 ? day.join(" ") : "every day"}`;
}

function dayMatches(sets: CronSets, d: Date): boolean {
  if (!sets.month.has(d.getUTCMonth() + 1)) return false;
  const domRestricted = !isFull(sets.dom, 1, 31);
  const dowRestricted = !isFull(sets.dow, 0, 6);
  const domOk = sets.dom.has(d.getUTCDate());
  const dowOk = sets.dow.has(d.getUTCDay());
  if (domRestricted && dowRestricted) return domOk || dowOk;
  if (domRestricted) return domOk;
  if (dowRestricted) return dowOk;
  return true;
}

function nextRuns(sets: CronSets, fromMs: number, count: number): Date[] {
  const out: Date[] = [];
  const startMs = Math.ceil((fromMs + 1) / 60_000) * 60_000;
  const start = new Date(startMs);
  const hours = [...sets.hour].sort((a, b) => a - b);
  const minutes = [...sets.minute].sort((a, b) => a - b);
  const day0 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  for (let i = 0; i < 366 && out.length < count; i++) {
    const d = new Date(day0 + i * 86_400_000);
    if (!dayMatches(sets, d)) continue;
    for (const h of hours) {
      for (const m of minutes) {
        const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
        if (t >= startMs) {
          out.push(new Date(t));
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

function fmtRun(d: Date): string {
  return `${RUN_DAY_FMT.format(d)} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

function buildCron(s: BuilderState): string {
  switch (s.preset) {
    case "minute":
      return "* * * * *";
    case "hourly":
      return `${s.minute} * * * *`;
    case "daily":
      return `${s.minute} ${s.hour} * * *`;
    case "weekly": {
      const d = [...s.dows].sort((a, b) => a - b).join(",");
      return `${s.minute} ${s.hour} * * ${d || "*"}`;
    }
    case "monthly":
      return `${s.minute} ${s.hour} ${s.dom} * *`;
    default:
      return s.rawFields.join(" ");
  }
}

function padFields(value: string): string[] {
  const f = value.trim().split(/\s+/).slice(0, 5);
  while (f.length < 5) f.push("*");
  return f;
}

function detectInitial(value: string): BuilderState {
  const def: BuilderState = {
    dom: 1,
    dows: new Set([1]),
    hour: 9,
    minute: 0,
    preset: "custom",
    rawFields: padFields(value),
  };
  const f = value.trim().split(/\s+/);
  if (f.length !== 5) return def;
  const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : null);
  const [mi, h, dm, mo, dw] = f;
  const miN = num(mi);
  const hN = num(h);
  const dmN = num(dm);
  if (mi === "*" && h === "*" && dm === "*" && mo === "*" && dw === "*") {
    return { ...def, preset: "minute" };
  }
  if (miN !== null && miN <= 59 && h === "*" && dm === "*" && mo === "*" && dw === "*") {
    return { ...def, minute: miN, preset: "hourly" };
  }
  if (miN !== null && miN <= 59 && hN !== null && hN <= 23 && dm === "*" && mo === "*") {
    if (dw === "*") {
      if (dmN === null) return { ...def, hour: hN, minute: miN, preset: "daily" };
    } else if (/^\d+(,\d+)*$/.test(dw)) {
      const dows = new Set(dw.split(",").map((x) => (Number(x) === 7 ? 0 : Number(x))));
      if ([...dows].every((d) => d >= 0 && d <= 6)) {
        return { ...def, dows, hour: hN, minute: miN, preset: "weekly" };
      }
    }
  }
  if (
    miN !== null &&
    miN <= 59 &&
    hN !== null &&
    hN <= 23 &&
    dmN !== null &&
    dmN >= 1 &&
    dmN <= 31 &&
    mo === "*" &&
    dw === "*"
  ) {
    return { ...def, dom: dmN, hour: hN, minute: miN, preset: "monthly" };
  }
  return def;
}

export function CronBuilder({ value = "0 9 * * 1", onChange, className }: CronBuilderProps) {
  const [state, setState] = useState<BuilderState>(() => detectInitial(value));
  const [copied, setCopied] = useState(false);
  const mounted = useMounted();

  const cron = buildCron(state);
  const lastRef = useRef(cron);
  useEffect(() => {
    if (lastRef.current !== cron) {
      lastRef.current = cron;
      onChange?.(cron);
    }
  }, [cron, onChange]);

  const parsed = parseCron(cron);
  const runs = mounted && "sets" in parsed ? nextRuns(parsed.sets, Date.now(), 3) : [];

  const setPreset = (p: Preset) =>
    setState((s) =>
      p === "custom"
        ? { ...s, preset: p, rawFields: buildCron(s).split(" ") }
        : { ...s, preset: p },
    );
  const update = (patch: Partial<BuilderState>) => setState((s) => ({ ...s, ...patch }));
  const toggleDow = (d: number) =>
    setState((s) => {
      const next = new Set(s.dows);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return { ...s, dows: next };
    });
  const setRawField = (i: number, v: string) =>
    setState((s) => {
      const f = [...s.rawFields];
      f[i] = v;
      return { ...s, rawFields: f };
    });
  const copy = () => {
    navigator.clipboard?.writeText(cron);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const numSelect = (
    val: number,
    set: (n: number) => void,
    min: number,
    max: number,
    fmt: (n: number) => string,
  ) => (
    <select
      className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
      onChange={(e) => set(Number(e.target.value))}
      value={val}
    >
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <option key={n} value={n}>
          {fmt(n)}
        </option>
      ))}
    </select>
  );

  const timeSelects = (
    <>
      <span className="text-muted-foreground">At</span>
      {numSelect(state.hour, (n) => update({ hour: n }), 0, 23, pad2)}
      <span className="text-muted-foreground">:</span>
      {numSelect(state.minute, (n) => update({ minute: n }), 0, 59, pad2)}
    </>
  );

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center gap-1 border-border border-b px-3 py-2 font-sans">
        {PRESETS.map((p) => (
          <button
            className={cn(
              "rounded-md px-2 py-1 text-[11px] transition-colors",
              state.preset === p.key
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={p.key}
            onClick={() => setPreset(p.key)}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2.5 font-sans">
        {state.preset === "minute" ? (
          <span className="text-muted-foreground">Runs every minute.</span>
        ) : null}
        {state.preset === "hourly" ? (
          <>
            <span className="text-muted-foreground">At minute</span>
            {numSelect(state.minute, (n) => update({ minute: n }), 0, 59, pad2)}
            <span className="text-muted-foreground">past every hour</span>
          </>
        ) : null}
        {state.preset === "daily" ? (
          <>
            {timeSelects}
            <span className="text-muted-foreground">every day</span>
          </>
        ) : null}
        {state.preset === "weekly" ? (
          <>
            {timeSelects}
            <span className="text-muted-foreground">on</span>
            <span className="flex items-center gap-1">
              {DOW_LABELS.map((label, d) => {
                const on = state.dows.has(d);
                return (
                  <button
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                      on
                        ? "border-foreground/30 bg-muted font-medium text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    key={label}
                    onClick={() => toggleDow(d)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </span>
          </>
        ) : null}
        {state.preset === "monthly" ? (
          <>
            {timeSelects}
            <span className="text-muted-foreground">on day</span>
            {numSelect(state.dom, (n) => update({ dom: n }), 1, 31, String)}
            <span className="text-muted-foreground">of the month</span>
          </>
        ) : null}
        {state.preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-1.5">
            {state.rawFields.map((f, i) => (
              <label className="flex flex-col gap-0.5" key={RAW_LABELS[i]}>
                <span className="text-[9px] text-muted-foreground uppercase">{RAW_LABELS[i]}</span>
                <input
                  className="h-7 w-16 rounded-md border border-border bg-background px-1.5 text-center font-mono text-xs outline-none focus:border-foreground/30"
                  onChange={(e) => setRawField(i, e.target.value)}
                  value={f}
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-border border-t px-3 py-2.5">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm">{cron}</code>
          <button
            className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={copy}
            type="button"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {"error" in parsed ? (
          <p className="font-mono text-[11px] text-red-500">{parsed.error}</p>
        ) : (
          <>
            <p className="text-muted-foreground">{describe(parsed.sets)}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Next:</span>
              {mounted && runs.length > 0 ? (
                runs.map((r) => (
                  <span className="font-mono" key={r.getTime()}>
                    {fmtRun(r)}
                  </span>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CronBuilder;
