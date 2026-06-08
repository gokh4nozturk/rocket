"use client";

import { Activity, DollarSign, Users } from "lucide-react";
import { StatTile } from "@/components/craft/stat-tile";

const revenueSpark = [32, 38, 35, 42, 48, 46, 52, 50, 58, 61, 59, 65];
const churnSpark = [2.1, 2.0, 2.2, 1.9, 1.8, 1.9, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2];
const usersSpark = [820, 910, 880, 1020, 1100, 1080, 1240, 1300, 1280, 1410, 1490, 1620];

/**
 * Showcase-only wrapper. Lives in a client module so the lucide icon
 * components can be passed as `icon` props without crossing the
 * Server → Client Component boundary (which cannot serialize functions).
 */
export function StatTileDemo() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-3">
      <StatTile
        data={revenueSpark}
        delta={12.5}
        icon={DollarSign}
        label="Monthly Revenue"
        period="vs last month"
        prefix="$"
        value={48200}
      />
      <StatTile
        data={churnSpark}
        delta={-0.8}
        icon={Activity}
        invertDelta
        label="Churn Rate"
        period="vs last month"
        suffix="%"
        value={1.2}
      />
      <StatTile
        data={usersSpark}
        delta={8.3}
        icon={Users}
        label="Active Users"
        period="vs last week"
        value={1620}
      />
    </div>
  );
}
