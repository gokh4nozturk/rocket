"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type TsUnit = "auto" | "ms" | "s";

export type ParsedTimestamp = { ms: number; ok: true } | { error: string; ok: false };

export interface TimestampConverterProps {
  baseTime?: number;
  className?: string;
  defaultUnit?: TsUnit;
  defaultValue?: string;
}

const COLOR_TIME = "#f59e0b";
const COLOR_ERROR = "#ef4444";

const UNITS: TsUnit[] = ["auto", "s", "ms"];

const ZONES: { label: string; tz: string }[] = [
  { label: "UTC", tz: "UTC" },
  { label: "New York", tz: "America/New_York" },
  { label: "Istanbul", tz: "Europe/Istanbul" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
];

const UTC_WD = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const UTC_MO = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

const DEFAULT_BASE = 1_781_524_800_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseTimestamp(raw: string, unit: TsUnit): ParsedTimestamp {
  const s = raw.trim();
  if (s === "") return { error: "", ok: false };
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    const ms = unit === "ms" ? n : unit === "s" ? n * 1000 : Math.abs(n) >= 1e12 ? n : n * 1000;
    if (!Number.isFinite(ms) || Number.isNaN(new Date(ms).getTime())) {
      return { error: "out of range", ok: false };
    }
    return { ms, ok: true };
  }
  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) return { error: "unrecognized timestamp", ok: false };
  return { ms: parsed, ok: true };
}

function humanUtc(d: Date): string {
  return `${UTC_WD.format(d)}, ${UTC_MO.format(d)} ${d.getUTCDate()} ${d.getUTCFullYear()} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
}

function fmtZone(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: tz,
    year: "numeric",
  }).formatToParts(d);
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

function zoneOffset(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(d);
  return parts.find((x) => x.type === "timeZoneName")?.value ?? "";
}

export function relativeTime(deltaMs: number): string {
  if (Math.abs(deltaMs) < 1000) return "just now";
  const past = deltaMs >= 0;
  const total = Math.abs(deltaMs) / 1000;
  const units: [string, number][] = [
    ["year", 31_536_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [name, sec] of units) {
    if (total >= sec || name === "second") {
      const n = Math.floor(total / sec);
      const label = `${n} ${name}${n === 1 ? "" : "s"}`;
      return past ? `${label} ago` : `in ${label}`;
    }
  }
  return "just now";
}

export function TimestampConverter({
  baseTime = DEFAULT_BASE,
  className,
  defaultUnit = "auto",
  defaultValue = "1781510400",
}: TimestampConverterProps) {
  const [value, setValue] = useState(defaultValue);
  const [unit, setUnit] = useState<TsUnit>(defaultUnit);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const parsed = parseTimestamp(value, unit);
  const date = parsed.ok ? new Date(parsed.ms) : null;

  function copy(key: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 1200);
    });
  }

  const rows: { copy?: string; key: string; label: string; value: string }[] =
    parsed.ok && date !== null
      ? [
          {
            copy: String(Math.floor(parsed.ms / 1000)),
            key: "s",
            label: "epoch (s)",
            value: String(Math.floor(parsed.ms / 1000)),
          },
          { copy: String(parsed.ms), key: "ms", label: "epoch (ms)", value: String(parsed.ms) },
          {
            copy: date.toISOString(),
            key: "iso",
            label: "ISO 8601",
            value: date.toISOString(),
          },
          { key: "utc", label: "UTC", value: humanUtc(date) },
        ]
      : [];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <span className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Timestamp"
            className={cn(
              "h-7 flex-1 rounded-md border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring",
              !parsed.ok && parsed.error !== "" ? "border-red-500" : "border-border",
            )}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            placeholder="epoch or ISO 8601"
            spellCheck={false}
            type="text"
            value={value}
          />
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">unit</span>
            {UNITS.map((u) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  u === unit
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                key={u}
                onClick={() => {
                  setUnit(u);
                }}
                type="button"
              >
                {u}
              </button>
            ))}
          </span>
        </span>
      </div>
      <div className="p-3">
        {!parsed.ok ? (
          parsed.error === "" ? (
            <p className="text-muted-foreground">Enter an epoch or ISO 8601 timestamp</p>
          ) : (
            <p style={{ color: COLOR_ERROR }}>{parsed.error}</p>
          )
        ) : (
          date !== null && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[6rem_1fr_auto] items-center gap-x-2 gap-y-1.5">
                {rows.map((r) => (
                  <div className="contents" key={r.key}>
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="break-all font-mono" style={{ color: COLOR_TIME }}>
                      {r.value}
                    </span>
                    {r.copy !== undefined ? (
                      <button
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          copy(r.key, r.copy ?? "");
                        }}
                        type="button"
                      >
                        {copiedKey === r.key ? "Copied" : "Copy"}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1 border-border border-t pt-2">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  time zones
                </p>
                <div className="grid grid-cols-[6rem_1fr_auto] gap-x-2 gap-y-1.5">
                  {ZONES.map((z) => (
                    <div className="contents" key={z.tz}>
                      <span className="text-muted-foreground">{z.label}</span>
                      <span className="break-all font-mono">{fmtZone(date, z.tz)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {zoneOffset(date, z.tz)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="border-border border-t pt-2 text-muted-foreground">
                <span className="font-medium" style={{ color: COLOR_TIME }}>
                  {relativeTime(baseTime - parsed.ms)}
                </span>{" "}
                relative to {new Date(baseTime).toISOString()}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default TimestampConverter;
