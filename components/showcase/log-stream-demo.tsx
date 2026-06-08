"use client";

import { useEffect, useRef, useState } from "react";
import { type LogEntry, type LogLevel, LogStream } from "@/components/craft/log-stream";

const SAMPLES: { level: LogLevel; message: string; detail?: unknown }[] = [
  { level: "info", message: "GET /api/users 200 in 42ms" },
  { level: "debug", message: "cache hit user:8x21" },
  { level: "info", message: "POST /api/orders 201 in 88ms" },
  {
    detail: { durationMs: 1204, query: "SELECT * FROM events", rows: 18422 },
    level: "warn",
    message: "slow query: SELECT * FROM events (1.2s)",
  },
  {
    detail:
      "TypeError: Cannot read properties of undefined (reading 'id')\n    at handle (worker.ts:42:18)\n    at process (queue.ts:11:7)",
    level: "error",
    message: "Unhandled rejection in worker #3",
  },
  { level: "info", message: "deploy: rocket@1.4.0 promoted to production" },
  { level: "debug", message: "ws ping 12ms" },
  { level: "warn", message: "rate limit near threshold for key pk_live_…" },
];

/**
 * Showcase-only wrapper. Lives in a client module so its timer/state stay on the
 * client side of the Server → Client Component boundary.
 */
export function LogStreamDemo() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const seed: LogEntry[] = SAMPLES.slice(0, 4).map((s, i) => ({
      ...s,
      id: `log-${i}`,
      time: now - (4 - i) * 1500,
    }));
    counter.current = 4;
    setEntries(seed);

    const timer = setInterval(() => {
      setEntries((prev) => {
        const s = SAMPLES[counter.current % SAMPLES.length];
        const id = `log-${counter.current}`;
        counter.current += 1;
        return [...prev, { ...s, id, time: Date.now() }].slice(-200);
      });
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return <LogStream entries={entries} height={300} />;
}
