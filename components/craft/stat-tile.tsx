"use client";

import { type LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { animate as animateValue } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: number;
  data?: number[];
  delta?: number;
  invertDelta?: boolean;
  icon?: LucideIcon;
  period?: string;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  animate?: boolean;
  className?: string;
}

type Tone = "good" | "bad" | "neutral";

function toneOf(delta: number | undefined, invert: boolean): Tone {
  if (delta === undefined || delta === 0) return "neutral";
  const positive = delta > 0;
  const good = invert ? !positive : positive;
  return good ? "good" : "bad";
}

function decimalsOf(n: number): number {
  if (Number.isInteger(n)) return 0;
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

const TONE_TEXT: Record<Tone, string> = {
  bad: "text-red-600 dark:text-red-400",
  good: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
};

const TONE_STROKE: Record<Tone, string> = {
  bad: "#ef4444",
  good: "#10b981",
  neutral: "#94a3b8",
};

function AnimatedNumber({
  value,
  animate: doAnimate,
  format,
}: {
  value: number;
  animate: boolean;
  format: (n: number) => string;
}) {
  const [display, setDisplay] = useState(() => format(value));
  const formatRef = useRef(format);
  formatRef.current = format;
  const decimals = decimalsOf(value);

  useEffect(() => {
    const fmt = formatRef.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!doAnimate || reduce) {
      setDisplay(fmt(value));
      return;
    }
    const controls = animateValue(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        const rounded = decimals === 0 ? Math.round(latest) : Number(latest.toFixed(decimals));
        setDisplay(fmt(rounded));
      },
    });
    return () => controls.stop();
  }, [value, doAnimate, decimals]);

  return <span className="tabular-nums">{display}</span>;
}

function Sparkline({
  data,
  stroke,
  gradientId,
}: {
  data: number[];
  stroke: string;
  gradientId: string;
}) {
  const chartData = data.map((v) => ({ v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="v"
            dot={false}
            fill={`url(#${gradientId})`}
            stroke={stroke}
            strokeWidth={1.5}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatTile({
  label,
  value,
  data,
  delta,
  invertDelta = false,
  icon: Icon,
  period,
  prefix,
  suffix,
  format,
  animate = true,
  className,
}: StatTileProps) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const tone = toneOf(delta, invertDelta);
  const TrendIcon =
    delta === undefined || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const formatValue = format ?? ((n: number) => new Intl.NumberFormat("en-US").format(n));

  return (
    <div
      className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon ? <Icon className="size-4" /> : null}
        <span className="font-medium text-sm">{label}</span>
      </div>

      <div className="font-semibold text-3xl text-foreground leading-none">
        {prefix ? <span className="text-muted-foreground">{prefix}</span> : null}
        <AnimatedNumber animate={animate} format={formatValue} value={value} />
        {suffix ? (
          <span className="ml-0.5 font-normal text-muted-foreground text-xl">{suffix}</span>
        ) : null}
      </div>

      {delta !== undefined ? (
        <div className={cn("flex items-center gap-1 text-xs", TONE_TEXT[tone])}>
          <TrendIcon className="size-3.5" />
          <span className="font-medium">
            {delta > 0 ? "+" : delta < 0 ? "-" : ""}
            {Math.abs(delta)}%
          </span>
          {period ? <span className="text-muted-foreground">{period}</span> : null}
        </div>
      ) : null}

      {data && data.length > 0 ? (
        <Sparkline data={data} gradientId={gradientId} stroke={TONE_STROKE[tone]} />
      ) : null}
    </div>
  );
}

export default StatTile;
