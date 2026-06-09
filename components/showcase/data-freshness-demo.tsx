"use client";

import { useEffect, useMemo, useState } from "react";
import { DataFreshness, type DataSource } from "@/components/craft/data-freshness";

const MIN = 60_000;

type Seed = {
  id: string;
  name: string;
  type: DataSource["type"];
  agoMin: number;
  slaMin: number;
  schedule: string;
  rows: number;
  nextInMin?: number;
  status?: DataSource["status"];
};

const SEEDS: Seed[] = [
  {
    agoMin: 3,
    id: "orders",
    name: "orders",
    nextInMin: 12,
    rows: 482_300,
    schedule: "every 15m",
    slaMin: 15,
    type: "table",
  },
  {
    agoMin: 52,
    id: "events",
    name: "events_raw",
    nextInMin: 3,
    rows: 18_402_211,
    schedule: "every 30m",
    slaMin: 30,
    type: "stream",
  },
  {
    agoMin: 70,
    id: "stripe",
    name: "stripe_sync",
    nextInMin: 8,
    rows: 12_044,
    schedule: "hourly",
    slaMin: 60,
    status: "failed",
    type: "api",
  },
  {
    agoMin: 1,
    id: "click",
    name: "clickstream",
    rows: 9_320_111,
    schedule: "continuous",
    slaMin: 5,
    status: "running",
    type: "stream",
  },
  {
    agoMin: 8,
    id: "s3",
    name: "s3_daily_export",
    nextInMin: 960,
    rows: 1_200_000,
    schedule: "daily 02:00",
    slaMin: 1440,
    type: "file",
  },
];

function build(now: number): DataSource[] {
  return SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    nextRun: s.nextInMin !== undefined ? now + s.nextInMin * MIN : undefined,
    rows: s.rows,
    schedule: s.schedule,
    sla: s.slaMin * MIN,
    status: s.status,
    type: s.type,
    updatedAt: now - s.agoMin * MIN,
  }));
}

/**
 * Showcase-only wrapper. Builds `updatedAt`/`nextRun` relative to the real `now`
 * (post-mount) so freshness/SLA stay correct whenever the page is viewed.
 */
export function DataFreshnessDemo() {
  const [now, setNow] = useState(Date.UTC(2026, 5, 9, 9, 0, 0));
  useEffect(() => setNow(Date.now()), []);
  const sources = useMemo(() => build(now), [now]);
  return <DataFreshness sources={sources} />;
}
