"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ParsedJwt =
  | {
      header: Record<string, unknown>;
      ok: true;
      parts: [string, string, string];
      payload: Record<string, unknown>;
    }
  | { error: string; ok: false };

export interface JwtDecoderProps {
  className?: string;
  defaultValue?: string;
}

const COLOR_ERROR = "#ef4444";
const COLOR_HEADER = "#3b82f6";
const COLOR_PAYLOAD = "#10b981";
const COLOR_SIG = "#a855f7";
const COLOR_TIME = "#f59e0b";

const KNOWN_CLAIMS: Record<string, string> = {
  aud: "audience",
  exp: "expires",
  iat: "issued at",
  iss: "issuer",
  jti: "JWT ID",
  nbf: "not before",
  sub: "subject",
};

const TIME_CLAIMS = new Set(["exp", "iat", "nbf"]);

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

function fmtTs(sec: number): string {
  const d = new Date(sec * 1000);
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  return `${TS_DATE.format(d)} · ${time} UTC`;
}

function fmtDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function b64url(json: string): string {
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const JWT_SAMPLE_TOKEN = [
  b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  b64url(
    JSON.stringify({
      aud: "api://default",
      exp: 1768483845,
      iat: 1768480245,
      iss: "https://auth.example.com",
      sub: "user_42",
    }),
  ),
  "c2lnbmF0dXJlLW5vdC12ZXJpZmllZA",
].join(".");

function decodeSegment(seg: string): Record<string, unknown> | null {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseJwt(input: string): ParsedJwt {
  const parts = input.trim().split(".");
  if (parts.length !== 3) {
    return {
      error: `expected 3 dot-separated segments, got ${parts.length}`,
      ok: false,
    };
  }
  const rawHeader = parts[0] ?? "";
  const rawPayload = parts[1] ?? "";
  const rawSig = parts[2] ?? "";
  const header = decodeSegment(rawHeader);
  if (header === null) {
    return { error: "invalid header (not base64url JSON)", ok: false };
  }
  const payload = decodeSegment(rawPayload);
  if (payload === null) {
    return { error: "invalid payload (not base64url JSON)", ok: false };
  }
  return {
    header,
    ok: true,
    parts: [rawHeader, rawPayload, rawSig],
    payload,
  };
}

function renderValue(key: string, value: unknown) {
  if (TIME_CLAIMS.has(key) && typeof value === "number") {
    return (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span style={{ color: COLOR_TIME }}>{fmtTs(value)}</span>
        <span className="text-muted-foreground">unix {value}</span>
      </span>
    );
  }
  if (typeof value === "string") return <span>{value}</span>;
  return <span>{JSON.stringify(value)}</span>;
}

function FieldRows({ annotate, fields }: { annotate: boolean; fields: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-y-1.5">
      {Object.entries(fields).map(([key, value]) => {
        const note = annotate ? KNOWN_CLAIMS[key] : undefined;
        return (
          <div className="contents" key={key}>
            <span className="text-muted-foreground">
              <span className="font-mono">{key}</span>
              {note !== undefined && <span className="ml-1 text-[10px]">({note})</span>}
            </span>
            <span className="break-all font-mono">{renderValue(key, value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function JwtDecoder({ className, defaultValue = "" }: JwtDecoderProps) {
  const [value, setValue] = useState(defaultValue);

  const trimmed = value.trim();
  const parsed = trimmed === "" ? null : parseJwt(trimmed);
  const decoded = parsed?.ok ? parsed : null;

  const alg = decoded === null ? undefined : decoded.header.alg;
  const exp = decoded === null ? undefined : decoded.payload.exp;
  const iat = decoded === null ? undefined : decoded.payload.iat;
  const lifetime =
    typeof exp === "number" && typeof iat === "number" && exp > iat ? fmtDur(exp - iat) : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <textarea
          aria-label="JWT"
          className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="paste a JWT"
          rows={3}
          spellCheck={false}
          value={value}
        />
        <div className="flex items-center gap-1.5">
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setValue(JWT_SAMPLE_TOKEN);
            }}
            type="button"
          >
            load sample
          </button>
        </div>
      </div>
      <div className="p-3">
        {trimmed === "" ? (
          <p className="text-muted-foreground">Paste a JWT or load the sample</p>
        ) : parsed !== null && !parsed.ok ? (
          <p style={{ color: COLOR_ERROR }}>{parsed.error}</p>
        ) : (
          decoded !== null && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 font-medium font-mono"
                  style={{
                    backgroundColor: `${COLOR_HEADER}1f`,
                    color: COLOR_HEADER,
                  }}
                >
                  {typeof alg === "string" ? `JWT · ${alg}` : "JWT"}
                </span>
                <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: COLOR_HEADER }}
                    />
                    header
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: COLOR_PAYLOAD }}
                    />
                    payload
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-[2px]" style={{ backgroundColor: COLOR_SIG }} />
                    signature
                  </span>
                </span>
              </div>
              <div className="break-all font-mono">
                <span style={{ color: COLOR_HEADER }}>{decoded.parts[0]}</span>
                <span className="text-muted-foreground">.</span>
                <span style={{ color: COLOR_PAYLOAD }}>{decoded.parts[1]}</span>
                <span className="text-muted-foreground">.</span>
                <span style={{ color: COLOR_SIG }}>{decoded.parts[2]}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  header
                </p>
                <FieldRows annotate={false} fields={decoded.header} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  claims
                </p>
                <FieldRows annotate={true} fields={decoded.payload} />
              </div>
              <div className="flex flex-col gap-1 border-border border-t pt-2">
                {lifetime !== null && (
                  <p>
                    <span className="text-muted-foreground">lifetime:</span>{" "}
                    <span className="font-medium font-mono">{lifetime}</span>
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  signature not verified (decode only)
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default JwtDecoder;
