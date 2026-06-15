"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type OutputMode = "schema" | "typescript";

export interface Schema {
  $schema?: string;
  anyOf?: Schema[];
  format?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  type?: string | string[];
}

export interface JsonSchemaInfererProps {
  className?: string;
  defaultMode?: OutputMode;
  defaultValue?: string;
}

const COLOR_ERROR = "#ef4444";
const SCHEMA_URI = "http://json-schema.org/draft-07/schema#";

const MODES: { label: string; value: OutputMode }[] = [
  { label: "JSON Schema", value: "schema" },
  { label: "TypeScript", value: "typescript" },
];

const ISO_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ISO_D = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const IDENT = /^[A-Za-z_$][\w$]*$/;

export const SCHEMA_SAMPLE = `{
  "id": "usr_8x21",
  "active": true,
  "score": 4.5,
  "age": 30,
  "email": "ada@acme.io",
  "createdAt": "2026-06-15T08:00:00Z",
  "roles": ["admin", "engineer"],
  "profile": { "city": "London", "verified": false },
  "orders": [
    { "id": "ord_1", "total": 129.99 },
    { "id": "ord_2", "total": 14.5, "coupon": "SAVE10" }
  ],
  "lastSeen": null
}`;

const KIND_ORDER = ["object", "array", "string", "number", "integer", "boolean", "null"];

function kindOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  if (typeof v === "string") return "string";
  return "null";
}

function strFormat(s: string): string | null {
  if (ISO_DT.test(s)) return "date-time";
  if (ISO_D.test(s)) return "date";
  if (EMAIL.test(s)) return "email";
  if (UUID.test(s)) return "uuid";
  return null;
}

function single(norm: string[], values: unknown[]): Schema {
  if (norm.length > 1) {
    return { type: [...norm].sort() };
  }
  const k = norm[0] ?? "null";
  if (k === "object") {
    const objs = values.filter((v) => kindOf(v) === "object") as Record<string, unknown>[];
    const keyOrder: string[] = [];
    const seen = new Set<string>();
    for (const o of objs) {
      for (const key of Object.keys(o)) {
        if (!seen.has(key)) {
          seen.add(key);
          keyOrder.push(key);
        }
      }
    }
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const key of keyOrder) {
      const present = objs.filter((o) => Object.hasOwn(o, key));
      properties[key] = inferMany(present.map((o) => o[key]));
      if (present.length === objs.length) required.push(key);
    }
    const out: Schema = { type: "object" };
    out.properties = properties;
    if (required.length > 0) out.required = required;
    return out;
  }
  if (k === "array") {
    const arrs = values.filter((v) => kindOf(v) === "array") as unknown[][];
    const all: unknown[] = [];
    for (const a of arrs) {
      for (const el of a) all.push(el);
    }
    const out: Schema = { type: "array" };
    out.items = inferMany(all);
    return out;
  }
  if (k === "string") {
    const strs = values.filter((v) => typeof v === "string") as string[];
    const fmts = [...new Set(strs.map(strFormat))];
    const out: Schema = { type: "string" };
    if (fmts.length === 1 && fmts[0]) out.format = fmts[0];
    return out;
  }
  return { type: k };
}

export function inferMany(values: unknown[]): Schema {
  if (values.length === 0) return {};
  const kinds = [...new Set(values.map(kindOf))];
  const norm = [
    ...new Set(kinds.map((k) => (k === "integer" && kinds.includes("number") ? "number" : k))),
  ];
  const complex = norm.some((k) => k === "object" || k === "array");
  if (norm.length === 1 || !complex) {
    return single(norm, values);
  }
  const groups: Record<string, unknown[]> = {};
  for (const v of values) {
    let k = kindOf(v);
    if (k === "integer" && kinds.includes("number")) k = "number";
    const g = groups[k] ?? [];
    g.push(v);
    groups[k] = g;
  }
  const anyOf: Schema[] = [];
  for (const k of KIND_ORDER) {
    const g = groups[k];
    if (g) anyOf.push(single([k], g));
  }
  return { anyOf };
}

export function toSchemaString(root: unknown): string {
  return JSON.stringify({ $schema: SCHEMA_URI, ...inferMany([root]) }, null, 2);
}

function tsScalar(t: string | undefined): string {
  if (t === "integer" || t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "null") return "null";
  if (t === "string") return "string";
  return "unknown";
}

function tsType(sch: Schema, indent: number): string {
  if (sch.anyOf) return sch.anyOf.map((s) => tsType(s, indent)).join(" | ");
  if (Array.isArray(sch.type)) return sch.type.map((t) => tsScalar(t)).join(" | ");
  if (sch.type === "object") {
    const props = sch.properties ?? {};
    const keys = Object.keys(props);
    if (keys.length === 0) return "Record<string, unknown>";
    const req = new Set(sch.required ?? []);
    const pad = "  ".repeat(indent + 1);
    const lines = keys.map((k) => {
      const name = IDENT.test(k) ? k : JSON.stringify(k);
      return `${pad}${name}${req.has(k) ? "" : "?"}: ${tsType(props[k] ?? {}, indent + 1)};`;
    });
    return `{\n${lines.join("\n")}\n${"  ".repeat(indent)}}`;
  }
  if (sch.type === "array") {
    const it = tsType(sch.items ?? {}, indent);
    return /[ |{}]/.test(it) ? `Array<${it}>` : `${it}[]`;
  }
  return tsScalar(sch.type);
}

export function toTypeScriptString(root: unknown): string {
  return `type Root = ${tsType(inferMany([root]), 0)};`;
}

export function JsonSchemaInferer({
  className,
  defaultMode = "schema",
  defaultValue = SCHEMA_SAMPLE,
}: JsonSchemaInfererProps) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<OutputMode>(defaultMode);
  const [copied, setCopied] = useState(false);

  const trimmed = value.trim();
  let parsed: unknown;
  let error = "";
  if (trimmed === "") {
    error = "empty";
  } else {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      error = "invalid JSON";
    }
  }
  const output =
    error === "" ? (mode === "schema" ? toSchemaString(parsed) : toTypeScriptString(parsed)) : "";

  function copyOutput() {
    void navigator.clipboard.writeText(output).then(() => {
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
        <textarea
          aria-label="JSON sample"
          className={cn(
            "min-h-0 w-full resize-y break-all rounded-md border bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:border-ring",
            error === "invalid JSON" ? "border-red-500" : "border-border",
          )}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          rows={6}
          spellCheck={false}
          value={value}
        />
        <div className="flex items-center gap-1.5">
          {MODES.map((m) => (
            <button
              className={cn(
                "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
                m.value === mode
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={m.value}
              onClick={() => {
                setMode(m.value);
              }}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {error !== "" ? (
          <p style={{ color: error === "invalid JSON" ? COLOR_ERROR : undefined }}>
            {error === "invalid JSON" ? (
              "invalid JSON"
            ) : (
              <span className="text-muted-foreground">Paste a sample JSON payload</span>
            )}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                {mode === "schema" ? "draft-07 schema" : "typescript"}
              </span>
              <button
                className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={copyOutput}
                type="button"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">
              {output}
            </pre>
            <p className="text-[10px] text-muted-foreground">
              inferred from a single sample — optional fields are only detected across array items
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default JsonSchemaInferer;
