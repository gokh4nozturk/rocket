"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Severity = "critical" | "warning" | "info";

export interface RoutingRule {
  id: string;
  name: string;
  severities: Severity[];
  servicePattern: string;
  channel: string;
  enabled: boolean;
}

export interface RoutingRulesProps {
  rules: RoutingRule[];
  channels: string[];
  onChange?: (rules: RoutingRule[]) => void;
  className?: string;
}

const SEVERITIES: Severity[] = ["critical", "warning", "info"];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  info: "#3b82f6",
  warning: "#f59e0b",
};

function matchRule(rule: RoutingRule, severity: Severity, service: string): boolean {
  if (!rule.enabled) return false;
  if (rule.severities.length > 0 && !rule.severities.includes(severity)) return false;
  const pattern = rule.servicePattern.trim().toLowerCase();
  if (pattern !== "" && !service.toLowerCase().includes(pattern)) return false;
  return true;
}

function firstMatch(rules: RoutingRule[], severity: Severity, service: string): RoutingRule | null {
  for (const rule of rules) {
    if (matchRule(rule, severity, service)) return rule;
  }
  return null;
}

export function RoutingRules({
  rules: initialRules,
  channels,
  onChange,
  className,
}: RoutingRulesProps) {
  const [rules, setRules] = useState<RoutingRule[]>(initialRules);
  const [testSeverity, setTestSeverity] = useState<Severity>("critical");
  const [testService, setTestService] = useState("");
  const idRef = useRef(0);

  const commit = (next: RoutingRule[]) => {
    setRules(next);
    onChange?.(next);
  };

  const updateRule = (id: string, patch: Partial<RoutingRule>) =>
    commit(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleSeverity = (id: string, sev: Severity) =>
    commit(
      rules.map((r) => {
        if (r.id !== id) return r;
        const severities = r.severities.includes(sev)
          ? r.severities.filter((s) => s !== sev)
          : [...r.severities, sev];
        return { ...r, severities };
      }),
    );

  const move = (id: string, dir: -1 | 1) => {
    const idx = rules.findIndex((r) => r.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= rules.length) return;
    const next = [...rules];
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  const removeRule = (id: string) => commit(rules.filter((r) => r.id !== id));

  const addRule = () => {
    idRef.current += 1;
    commit([
      ...rules,
      {
        channel: channels[0] ?? "",
        enabled: true,
        id: `new-${idRef.current}`,
        name: "New rule",
        servicePattern: "",
        severities: [],
      },
    ]);
  };

  const matched = firstMatch(rules, testSeverity, testService);

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card text-xs", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="text-[11px]">
          <span className="font-medium">{rules.length} rules</span>
          <span className="ml-1.5 text-muted-foreground">· first match wins</span>
        </span>
        <button
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={addRule}
          type="button"
        >
          <Plus className="size-3" />
          Add rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="px-3 py-6 text-center text-muted-foreground italic">No rules — add one</p>
      ) : (
        <div className="divide-y divide-border/60">
          {rules.map((rule, i) => {
            const isMatch = matched?.id === rule.id;
            return (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 px-3 py-2 transition-colors",
                  !rule.enabled && "opacity-50",
                  isMatch && "bg-emerald-500/5 ring-1 ring-emerald-500/50 ring-inset",
                )}
                key={rule.id}
              >
                <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <input
                  aria-label={`Name for rule ${i + 1}`}
                  className="h-7 w-28 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-foreground/30"
                  onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                  value={rule.name}
                />
                <span className="flex items-center gap-1">
                  {SEVERITIES.map((sev) => {
                    const on = rule.severities.includes(sev);
                    return (
                      <button
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[10px] transition-colors",
                          on
                            ? "border-current font-medium"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                        key={sev}
                        onClick={() => toggleSeverity(rule.id, sev)}
                        style={on ? { color: SEVERITY_COLOR[sev] } : undefined}
                        type="button"
                      >
                        {sev}
                      </button>
                    );
                  })}
                </span>
                <input
                  aria-label={`Service pattern for rule ${i + 1}`}
                  className="h-7 w-28 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
                  onChange={(e) => updateRule(rule.id, { servicePattern: e.target.value })}
                  placeholder="any service"
                  value={rule.servicePattern}
                />
                <select
                  aria-label={`Channel for rule ${i + 1}`}
                  className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
                  onChange={(e) => updateRule(rule.id, { channel: e.target.value })}
                  value={rule.channel}
                >
                  {channels.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px] transition-colors",
                    rule.enabled
                      ? "border-emerald-500/50 font-medium text-emerald-500"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                  type="button"
                >
                  {rule.enabled ? "on" : "off"}
                </button>
                <span className="ml-auto flex shrink-0 items-center gap-0.5">
                  <button
                    aria-label={`Move rule ${i + 1} up`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(rule.id, -1)}
                    type="button"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    aria-label={`Move rule ${i + 1} down`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    disabled={i === rules.length - 1}
                    onClick={() => move(rule.id, 1)}
                    type="button"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    aria-label={`Delete rule ${i + 1}`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                    onClick={() => removeRule(rule.id)}
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 border-border border-t bg-muted/20 px-3 py-2.5 font-sans">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[11px]">Test an alert</span>
          <select
            aria-label="Test severity"
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-foreground/30"
            onChange={(e) => setTestSeverity(e.target.value as Severity)}
            value={testSeverity}
          >
            {SEVERITIES.map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>
          <input
            aria-label="Test service"
            className="h-7 w-36 rounded-md border border-border bg-background px-1.5 font-mono text-xs outline-none focus:border-foreground/30"
            onChange={(e) => setTestService(e.target.value)}
            placeholder="service name"
            value={testService}
          />
        </div>
        <p className="text-[11px]">
          {matched ? (
            <span className="text-emerald-500">
              → routes to <span className="font-medium font-mono">{matched.channel}</span> via “
              {matched.name}”
            </span>
          ) : (
            <span className="text-red-400">no rule matches — alert dropped</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default RoutingRules;
