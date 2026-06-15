"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Algo = "SHA-1" | "SHA-256" | "SHA-512";

export type Encoding = "base64" | "hex";

export type Scheme = "plain" | "prefixed" | "stripe";

export interface ParsedExpected {
  scheme: Scheme;
  sig: string;
  timestamp: string | null;
}

export interface WebhookSignatureVerifierProps {
  className?: string;
  defaultAlgo?: Algo;
  defaultEncoding?: Encoding;
  defaultExpected?: string;
  defaultPayload?: string;
  defaultSecret?: string;
}

const COLOR_ERROR = "#ef4444";
const COLOR_OK = "#10b981";
const COLOR_SIG = "#10b981";

const ALGOS: Algo[] = ["SHA-256", "SHA-1", "SHA-512"];
const ENCODINGS: Encoding[] = ["hex", "base64"];

const SAMPLE_SECRET = "whsec_rocket_demo";
const SAMPLE_PAYLOAD = '{"amount":2000,"id":"evt_1","type":"payment.succeeded"}';
const SAMPLE_EXPECTED = "65c947b44930d1189aef8973a3fc0c2bb8ace5e18fbca9be35b743732bb87a2a";

export function parseExpected(raw: string): ParsedExpected {
  const s = raw.trim();
  if (s === "") return { scheme: "plain", sig: "", timestamp: null };
  if (s.includes("v1=") && s.includes("t=")) {
    let timestamp: string | null = null;
    let sig = "";
    for (const part of s.split(",")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim();
      if (k === "t") timestamp = v;
      if (k === "v1" && sig === "") sig = v;
    }
    return { scheme: "stripe", sig, timestamp };
  }
  const m = s.match(/^(sha256|sha1|sha512)=(.*)$/);
  if (m) return { scheme: "prefixed", sig: (m[2] ?? "").trim(), timestamp: null };
  return { scheme: "plain", sig: s, timestamp: null };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmac(
  secret: string,
  message: string,
  algo: Algo,
): Promise<{ base64: string; hex: string }> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { hash: algo, name: "HMAC" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(buf);
  let hex = "";
  let bin = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
    bin += String.fromCharCode(b);
  }
  return { base64: btoa(bin), hex };
}

export function WebhookSignatureVerifier({
  className,
  defaultAlgo = "SHA-256",
  defaultEncoding = "hex",
  defaultExpected = SAMPLE_EXPECTED,
  defaultPayload = SAMPLE_PAYLOAD,
  defaultSecret = SAMPLE_SECRET,
}: WebhookSignatureVerifierProps) {
  const [algo, setAlgo] = useState<Algo>(defaultAlgo);
  const [encoding, setEncoding] = useState<Encoding>(defaultEncoding);
  const [payload, setPayload] = useState(defaultPayload);
  const [secret, setSecret] = useState(defaultSecret);
  const [expected, setExpected] = useState(defaultExpected);
  const [sig, setSig] = useState<{ base64: string; hex: string } | null>(null);
  const [computing, setComputing] = useState(true);
  const [copied, setCopied] = useState(false);

  const parsed = parseExpected(expected);
  const signedMessage =
    parsed.scheme === "stripe" && parsed.timestamp !== null
      ? `${parsed.timestamp}.${payload}`
      : payload;
  const payloadBytes = new TextEncoder().encode(payload).length;

  useEffect(() => {
    let cancelled = false;
    setComputing(true);
    computeHmac(secret, signedMessage, algo)
      .then((res) => {
        if (!cancelled) {
          setSig(res);
          setComputing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSig(null);
          setComputing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [algo, secret, signedMessage]);

  const computed = sig === null ? null : encoding === "hex" ? sig.hex : sig.base64;
  const normComputed =
    computed === null ? null : encoding === "hex" ? computed.toLowerCase() : computed;
  const normExpected = encoding === "hex" ? parsed.sig.toLowerCase() : parsed.sig;
  const match =
    parsed.sig === "" || normComputed === null ? null : timingSafeEqual(normComputed, normExpected);

  function copySig() {
    if (computed === null) return;
    void navigator.clipboard.writeText(computed).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-border border-b p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">algo</span>
            {ALGOS.map((a) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  a === algo
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                key={a}
                onClick={() => {
                  setAlgo(a);
                }}
                type="button"
              >
                {a}
              </button>
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">enc</span>
            {ENCODINGS.map((e) => (
              <button
                className={cn(
                  "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                  e === encoding
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                key={e}
                onClick={() => {
                  setEncoding(e);
                }}
                type="button"
              >
                {e}
              </button>
            ))}
          </span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">payload</span>
          <textarea
            aria-label="Payload"
            className="min-h-0 w-full resize-y break-all rounded-md border border-border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring"
            onChange={(e) => {
              setPayload(e.target.value);
            }}
            rows={3}
            spellCheck={false}
            value={payload}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            signing secret
          </span>
          <input
            aria-label="Signing secret"
            className="h-7 w-full rounded-md border border-border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring"
            onChange={(e) => {
              setSecret(e.target.value);
            }}
            spellCheck={false}
            type="text"
            value={secret}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            expected signature
          </span>
          <input
            aria-label="Expected signature"
            className="h-7 w-full rounded-md border border-border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring"
            onChange={(e) => {
              setExpected(e.target.value);
            }}
            placeholder="sha256=… or t=…,v1=… or raw"
            spellCheck={false}
            type="text"
            value={expected}
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            HMAC-{algo} · {encoding}
          </span>
          <button
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={copySig}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {computing || computed === null ? (
          <p className="font-mono text-muted-foreground">computing…</p>
        ) : (
          <p className="break-all font-mono" style={{ color: COLOR_SIG }}>
            {computed}
          </p>
        )}
        {parsed.scheme === "stripe" && parsed.timestamp !== null && (
          <p className="text-[10px] text-muted-foreground">
            Stripe scheme — signing{" "}
            <span className="font-mono">{parsed.timestamp}.&lt;payload&gt;</span>
          </p>
        )}
        {parsed.scheme === "prefixed" && (
          <p className="text-[10px] text-muted-foreground">
            stripped algorithm prefix from expected
          </p>
        )}
        <div className="flex items-center gap-2 border-border border-t pt-2">
          {match === null ? (
            <span className="text-muted-foreground">enter an expected signature to compare</span>
          ) : match ? (
            <span className="font-medium" style={{ color: COLOR_OK }}>
              ✓ signature valid
            </span>
          ) : (
            <span className="font-medium" style={{ color: COLOR_ERROR }}>
              ✗ mismatch
            </span>
          )}
          <span className="ml-auto text-muted-foreground">
            {payloadBytes} byte{payloadBytes === 1 ? "" : "s"} payload
          </span>
        </div>
      </div>
    </div>
  );
}

export default WebhookSignatureVerifier;
