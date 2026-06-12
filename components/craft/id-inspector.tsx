"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ParsedId =
  | {
      kind: "uuid";
      normalized: string;
      tsMs: number | null;
      variant: string;
      version: number;
    }
  | { kind: "ulid"; normalized: string; tsMs: number };

export interface IdInspectorProps {
  className?: string;
  defaultValue?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GREGORIAN_OFFSET_100NS = BigInt("122192928000000000");

const COLOR_META = "#a855f7";
const COLOR_RANDOM = "#3b82f6";
const COLOR_TIME = "#f59e0b";
const COLOR_ULID = "#10b981";

const SAMPLES = [
  { label: "UUID v4", value: "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
  { label: "UUID v7", value: "019bc1a3-0583-7abc-8def-0123456789ab" },
  { label: "ULID", value: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
];

const TS_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtTs(ms: number): string {
  const d = new Date(ms);
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, "0")}`;
  return `${TS_DATE.format(d)} · ${time} UTC`;
}

function variantLabel(c: string): string {
  if (c >= "0" && c <= "7") return "NCS (reserved)";
  if (c === "8" || c === "9" || c === "a" || c === "b") return "RFC 4122";
  if (c === "c" || c === "d") return "Microsoft (reserved)";
  return "future (reserved)";
}

function uuidTimestamp(normalized: string, version: number): number | null {
  if (version === 7) {
    return Number.parseInt(normalized.slice(0, 8) + normalized.slice(9, 13), 16);
  }
  if (version === 1) {
    const hex = normalized.slice(15, 18) + normalized.slice(9, 13) + normalized.slice(0, 8);
    const ts = BigInt(`0x${hex}`);
    if (ts < GREGORIAN_OFFSET_100NS) return null;
    return Number((ts - GREGORIAN_OFFSET_100NS) / BigInt(10000));
  }
  return null;
}

export function parseId(input: string): ParsedId | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  if (UUID_RE.test(lower)) {
    const version = Number.parseInt(lower.charAt(14), 16);
    return {
      kind: "uuid",
      normalized: lower,
      tsMs: uuidTimestamp(lower, version),
      variant: variantLabel(lower.charAt(19)),
      version,
    };
  }
  const upper = trimmed.toUpperCase();
  if (ULID_RE.test(upper)) {
    let ms = 0;
    for (let i = 0; i < 10; i++) {
      ms = ms * 32 + CROCKFORD.indexOf(upper.charAt(i));
    }
    return { kind: "ulid", normalized: upper, tsMs: ms };
  }
  return null;
}

function charColor(i: number, parsed: ParsedId): string | null {
  if (parsed.kind === "ulid") return i < 10 ? COLOR_TIME : COLOR_RANDOM;
  if (parsed.normalized.charAt(i) === "-") return null;
  if (i === 14 || i === 19) return COLOR_META;
  const isTime =
    parsed.version === 7 ? i < 13 : parsed.version === 1 ? i < 13 || (i >= 15 && i <= 17) : false;
  return isTime ? COLOR_TIME : COLOR_RANDOM;
}

function randomHexChars(version: number): number {
  const timeChars = version === 7 ? 12 : version === 1 ? 15 : 0;
  return 32 - timeChars - 2;
}

export function IdInspector({ className, defaultValue = "" }: IdInspectorProps) {
  const [value, setValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);

  const trimmed = value.trim();
  const parsed = trimmed === "" ? null : parseId(trimmed);

  const handleCopy = () => {
    const text = parsed ? parsed.normalized : trimmed;
    if (text === "") return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  };

  const badgeColor = parsed?.kind === "ulid" ? COLOR_ULID : COLOR_RANDOM;
  const badgeLabel =
    parsed === null ? "" : parsed.kind === "ulid" ? "ULID" : `UUID v${parsed.version}`;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-border border-b p-3">
        <input
          aria-label="Identifier"
          className="h-7 min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="paste a UUID or ULID"
          spellCheck={false}
          type="text"
          value={value}
        />
        <button
          className="h-7 rounded-md border border-border px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <div className="flex w-full items-center gap-1.5">
          <span className="text-muted-foreground">samples:</span>
          {SAMPLES.map((s) => (
            <button
              className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              key={s.label}
              onClick={() => {
                setValue(s.value);
              }}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3">
        {trimmed === "" ? (
          <p className="text-muted-foreground">Paste an identifier or pick a sample</p>
        ) : parsed === null ? (
          <p style={{ color: "#ef4444" }}>unrecognized format — expected a UUID or ULID</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 font-medium font-mono"
                style={{
                  backgroundColor: `${badgeColor}1f`,
                  color: badgeColor,
                }}
              >
                {badgeLabel}
              </span>
              <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-[2px]" style={{ backgroundColor: COLOR_TIME }} />
                  time
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-[2px]"
                    style={{ backgroundColor: COLOR_RANDOM }}
                  />
                  randomness
                </span>
                {parsed.kind === "uuid" && (
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: COLOR_META }}
                    />
                    version / variant
                  </span>
                )}
              </span>
            </div>
            <div className="break-all font-mono text-sm tracking-wide">
              {parsed.normalized.split("").map((ch, i) => {
                const color = charColor(i, parsed);
                return (
                  <span
                    className={color === null ? "text-muted-foreground" : undefined}
                    key={i}
                    style={color === null ? undefined : { color }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            <div className="grid grid-cols-[6rem_1fr] gap-y-1.5">
              <span className="text-muted-foreground">type</span>
              <span className="font-mono">{badgeLabel}</span>
              {parsed.kind === "uuid" && (
                <>
                  <span className="text-muted-foreground">variant</span>
                  <span className="font-mono">{parsed.variant}</span>
                </>
              )}
              <span className="text-muted-foreground">timestamp</span>
              {parsed.tsMs === null ? (
                <span className="text-muted-foreground">no embedded timestamp (random)</span>
              ) : (
                <span className="flex flex-wrap items-baseline gap-x-2 font-mono">
                  <span style={{ color: COLOR_TIME }}>{fmtTs(parsed.tsMs)}</span>
                  <span className="text-muted-foreground">unix {parsed.tsMs}</span>
                </span>
              )}
              <span className="text-muted-foreground">randomness</span>
              <span className="font-mono text-muted-foreground">
                {parsed.kind === "ulid"
                  ? "16 chars (80 bits)"
                  : `${randomHexChars(parsed.version)} hex chars`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdInspector;
