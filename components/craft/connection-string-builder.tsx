"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Engine = "mongodb" | "mysql" | "postgres" | "redis";

export interface ConnectionStringBuilderProps {
  className?: string;
  defaultEngine?: Engine;
}

export interface UriInput {
  database: string;
  host: string;
  password: string;
  port: string;
  ssl: boolean;
  user: string;
}

export interface UriParts {
  credentials: string;
  database: string;
  hostPort: string;
  params: string;
  scheme: string;
}

const COLOR_CREDS = "#a855f7";
const COLOR_DB = "#10b981";
const COLOR_HOST = "#f59e0b";
const COLOR_SCHEME = "#3b82f6";

const ENGINES: Engine[] = ["postgres", "mysql", "redis", "mongodb"];

interface EngineMeta {
  defaultPort: number;
  scheme: string;
  sslParam: string | null;
}

const ENGINE_META: Record<Engine, EngineMeta> = {
  mongodb: { defaultPort: 27017, scheme: "mongodb", sslParam: "tls=true" },
  mysql: { defaultPort: 3306, scheme: "mysql", sslParam: "ssl-mode=REQUIRED" },
  postgres: {
    defaultPort: 5432,
    scheme: "postgresql",
    sslParam: "sslmode=require",
  },
  redis: { defaultPort: 6379, scheme: "redis", sslParam: null },
};

export function buildUri(engine: Engine, input: UriInput): UriParts | null {
  const host = input.host.trim();
  if (host === "") return null;
  const meta = ENGINE_META[engine];
  const scheme = engine === "redis" && input.ssl ? "rediss://" : `${meta.scheme}://`;
  const portN = Number.parseInt(input.port, 10);
  const port = Number.isFinite(portN) && portN > 0 ? portN : meta.defaultPort;
  const user = input.user.trim();
  const credentials =
    user === ""
      ? ""
      : input.password === ""
        ? `${encodeURIComponent(user)}@`
        : `${encodeURIComponent(user)}:${encodeURIComponent(input.password)}@`;
  const db = input.database.trim();
  const database = db === "" ? "" : `/${encodeURIComponent(db)}`;
  const params = input.ssl && meta.sslParam !== null ? `?${meta.sslParam}` : "";
  return { credentials, database, hostPort: `${host}:${port}`, params, scheme };
}

export function maskCredentials(credentials: string, password: string): string {
  if (password === "" || credentials === "") return credentials;
  const idx = credentials.indexOf(":");
  if (idx === -1) return credentials;
  return `${credentials.slice(0, idx)}:••••@`;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function ConnectionStringBuilder({
  className,
  defaultEngine = "postgres",
}: ConnectionStringBuilderProps) {
  const [engine, setEngine] = useState<Engine>(defaultEngine);
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("");
  const [database, setDatabase] = useState("analytics");
  const [user, setUser] = useState("app");
  const [password, setPassword] = useState("s3cr3t@9");
  const [ssl, setSsl] = useState(false);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = ENGINE_META[engine];
  const parts = buildUri(engine, { database, host, password, port, ssl, user });
  const fullUri =
    parts === null
      ? ""
      : `${parts.scheme}${parts.credentials}${parts.hostPort}${parts.database}${parts.params}`;

  const handleCopy = () => {
    if (fullUri === "") return;
    navigator.clipboard.writeText(fullUri).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  };

  const fields: {
    label: string;
    placeholder: string;
    set: (v: string) => void;
    type: string;
    value: string;
  }[] = [
    {
      label: "Host",
      placeholder: "localhost",
      set: setHost,
      type: "text",
      value: host,
    },
    {
      label: "Port",
      placeholder: String(meta.defaultPort),
      set: setPort,
      type: "text",
      value: port,
    },
    {
      label: "Database",
      placeholder: "database",
      set: setDatabase,
      type: "text",
      value: database,
    },
    {
      label: "User",
      placeholder: "user",
      set: setUser,
      type: "text",
      value: user,
    },
    {
      label: "Password",
      placeholder: "password",
      set: setPassword,
      type: show ? "text" : "password",
      value: password,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground text-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-border border-b p-3">
        {ENGINES.map((e) => (
          <button
            className={cn(
              "rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
              e === engine
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            key={e}
            onClick={() => {
              setEngine(e);
            }}
            type="button"
          >
            {e}
          </button>
        ))}
        <button
          className={cn(
            "ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors",
            ssl
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={() => {
            setSsl((s) => !s);
          }}
          type="button"
        >
          ssl
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-border border-b p-3">
        {fields.map((f) => (
          <label className="flex flex-col gap-1" key={f.label}>
            <span className="text-[10px] text-muted-foreground lowercase">{f.label}</span>
            <input
              aria-label={f.label}
              className="h-7 w-28 rounded-md border border-border bg-transparent px-2 font-mono text-xs outline-none focus:border-ring"
              onChange={(e) => {
                f.set(e.target.value);
              }}
              placeholder={f.placeholder}
              spellCheck={false}
              type={f.type}
              value={f.value}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">connection string</span>
          <span className="ml-auto flex items-center gap-2">
            <LegendDot color={COLOR_SCHEME} label="scheme" />
            <LegendDot color={COLOR_CREDS} label="credentials" />
            <LegendDot color={COLOR_HOST} label="host" />
            <LegendDot color={COLOR_DB} label="database" />
          </span>
        </div>
        {parts === null ? (
          <p className="text-muted-foreground">enter a host</p>
        ) : (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 break-all font-mono">
              <span style={{ color: COLOR_SCHEME }}>{parts.scheme}</span>
              <span style={{ color: COLOR_CREDS }}>
                {show ? parts.credentials : maskCredentials(parts.credentials, password)}
              </span>
              <span style={{ color: COLOR_HOST }}>{parts.hostPort}</span>
              <span style={{ color: COLOR_DB }}>{parts.database}</span>
              <span className="text-muted-foreground">{parts.params}</span>
            </p>
            <button
              className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setShow((s) => !s);
              }}
              type="button"
            >
              {show ? "hide" : "show"}
            </button>
            <button
              className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleCopy}
              type="button"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectionStringBuilder;
