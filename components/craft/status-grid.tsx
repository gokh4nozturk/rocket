"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

export interface DayStatus {
  date: string | number | Date;
  status: ServiceStatus;
  note?: string;
}

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime?: number;
  metric?: string;
  category?: string;
  history?: DayStatus[];
}

export interface StatusGridProps {
  services: Service[];
  defaultCollapsed?: string[];
  historyDays?: number;
  className?: string;
}

const STATUS_ORDER: Record<ServiceStatus, number> = {
  degraded: 2,
  down: 3,
  maintenance: 1,
  operational: 0,
};

const STATUS_META: Record<ServiceStatus, { label: string; color: string }> = {
  degraded: { color: "#f59e0b", label: "Degraded" },
  down: { color: "#ef4444", label: "Down" },
  maintenance: { color: "#3b82f6", label: "Maintenance" },
  operational: { color: "#10b981", label: "Operational" },
};

const BANNER: Record<ServiceStatus, string> = {
  degraded: "Degraded performance",
  down: "Major outage",
  maintenance: "Under maintenance",
  operational: "All systems operational",
};

const ALL_STATUSES: ServiceStatus[] = ["operational", "degraded", "down", "maintenance"];

function worstStatus(statuses: ServiceStatus[]): ServiceStatus {
  let worst: ServiceStatus = "operational";
  for (const s of statuses) {
    if (STATUS_ORDER[s] > STATUS_ORDER[worst]) worst = s;
  }
  return worst;
}

function groupByCategory(services: Service[]): { category: string; services: Service[] }[] {
  const order: string[] = [];
  const map = new Map<string, Service[]>();
  for (const svc of services) {
    const cat = svc.category ?? "Other";
    if (!map.has(cat)) {
      map.set(cat, []);
      order.push(cat);
    }
    map.get(cat)?.push(svc);
  }
  return order.map((category) => ({ category, services: map.get(category) ?? [] }));
}

function padHistory(history: DayStatus[], days: number): (DayStatus | null)[] {
  const trimmed = history.length > days ? history.slice(history.length - days) : history;
  const pad = Math.max(0, days - trimmed.length);
  return [...Array.from({ length: pad }, () => null), ...trimmed];
}

function shortDate(date: string | number | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

function ServiceRow({
  service,
  historyDays,
  hovered,
  onHover,
}: {
  service: Service;
  historyDays: number;
  hovered: { serviceId: string; dayIndex: number } | null;
  onHover: (next: { serviceId: string; dayIndex: number } | null) => void;
}) {
  const meta = STATUS_META[service.status];
  const days = padHistory(service.history ?? [], historyDays);
  return (
    <div className="flex items-center gap-3 py-2 pr-3 pl-9">
      <span className="size-2 shrink-0 rounded-full" style={{ background: meta.color }} />
      <span className="truncate font-medium font-sans">{service.name}</span>
      {service.metric ? (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground tabular-nums">
          {service.metric}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        {service.uptime !== undefined ? (
          <span className="shrink-0 font-sans text-[11px] text-muted-foreground tabular-nums">
            {service.uptime}%
          </span>
        ) : null}
        <div className="flex h-6 w-36 items-stretch gap-px sm:w-56">
          {days.map((day, i) => {
            const active = hovered?.serviceId === service.id && hovered.dayIndex === i;
            return (
              <button
                aria-label={
                  day ? `${shortDate(day.date)}: ${STATUS_META[day.status].label}` : "No data"
                }
                className={cn(
                  "flex-1 rounded-[1px] transition-opacity",
                  active ? "opacity-100" : "opacity-90",
                )}
                key={`${service.id}-${i}`}
                onMouseEnter={() => onHover({ dayIndex: i, serviceId: service.id })}
                onMouseLeave={() =>
                  onHover(
                    hovered?.serviceId === service.id && hovered.dayIndex === i ? null : hovered,
                  )
                }
                style={{
                  background: day ? STATUS_META[day.status].color : "var(--muted-foreground)",
                  opacity: day ? undefined : 0.2,
                }}
                type="button"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StatusGrid({
  services,
  defaultCollapsed = [],
  historyDays = 90,
  className,
}: StatusGridProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(defaultCollapsed));
  const [hovered, setHovered] = useState<{ serviceId: string; dayIndex: number } | null>(null);

  const groups = useMemo(() => groupByCategory(services), [services]);
  const overall = useMemo(() => worstStatus(services.map((s) => s.status)), [services]);
  const hoverInfo = useMemo(() => {
    if (!hovered) return null;
    const svc = services.find((s) => s.id === hovered.serviceId);
    if (!svc) return null;
    const day = padHistory(svc.history ?? [], historyDays)[hovered.dayIndex];
    return { day, name: svc.name };
  }, [hovered, services, historyDays]);

  if (services.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No services
      </div>
    );
  }

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-3 py-2.5"
        style={{ background: `${STATUS_META[overall].color}14` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ background: STATUS_META[overall].color }}
          />
          <span
            className="font-medium font-sans text-sm"
            style={{ color: STATUS_META[overall].color }}
          >
            {BANNER[overall]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-sans text-[10px] text-muted-foreground">
          {ALL_STATUSES.map((s) => (
            <span className="flex items-center gap-1" key={s}>
              <span
                className="size-1.5 rounded-full"
                style={{ background: STATUS_META[s].color }}
              />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.category);
          const opCount = group.services.filter((s) => s.status === "operational").length;
          return (
            <div key={group.category}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
                onClick={() => toggle(group.category)}
                type="button"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    !isCollapsed && "rotate-90",
                  )}
                />
                <span className="font-medium font-sans text-sm">{group.category}</span>
                <span className="ml-auto font-sans text-[11px] text-muted-foreground tabular-nums">
                  {opCount}/{group.services.length} operational
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isCollapsed ? null : (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {group.services.map((svc) => (
                      <ServiceRow
                        historyDays={historyDays}
                        hovered={hovered}
                        key={svc.id}
                        onHover={setHovered}
                        service={svc}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="border-border border-t px-3 py-2 font-sans text-[11px] text-muted-foreground">
        {hoverInfo ? (
          hoverInfo.day ? (
            <span>
              <span className="font-medium text-foreground">{hoverInfo.name}</span> ·{" "}
              {shortDate(hoverInfo.day.date)} ·{" "}
              <span style={{ color: STATUS_META[hoverInfo.day.status].color }}>
                {STATUS_META[hoverInfo.day.status].label}
              </span>
              {hoverInfo.day.note ? ` · ${hoverInfo.day.note}` : ""}
            </span>
          ) : (
            <span>
              <span className="font-medium text-foreground">{hoverInfo.name}</span> · No data
            </span>
          )
        ) : (
          <span>Hover a day in a timeline for detail</span>
        )}
      </div>
    </div>
  );
}

export default StatusGrid;
