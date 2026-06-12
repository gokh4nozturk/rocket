"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

export type Permission = "none" | "read" | "write";

export interface AccessMatrixProps {
  roles: string[];
  resources: string[];
  defaultGrants?: Record<string, Permission>;
  onChange?: (grants: Record<string, Permission>) => void;
  className?: string;
}

const NEXT: Record<Permission, Permission> = {
  none: "read",
  read: "write",
  write: "none",
};

const PERM_META: Record<Permission, { label: string; color: string | null }> = {
  none: { color: null, label: "—" },
  read: { color: "#3b82f6", label: "R" },
  write: { color: "#10b981", label: "W" },
};

function keyOf(role: string, resource: string): string {
  return `${role}:${resource}`;
}

function bulkNext(values: Permission[]): Permission {
  const first = values[0] ?? "none";
  const uniform = values.every((v) => v === first);
  return uniform ? NEXT[first] : "read";
}

export function AccessMatrix({
  roles,
  resources,
  defaultGrants,
  onChange,
  className,
}: AccessMatrixProps) {
  const [grants, setGrants] = useState<Record<string, Permission>>(() => ({
    ...defaultGrants,
  }));

  const permOf = (role: string, resource: string): Permission =>
    grants[keyOf(role, resource)] ?? "none";

  const commit = (next: Record<string, Permission>) => {
    setGrants(next);
    onChange?.(next);
  };

  const cycleCell = (role: string, resource: string) => {
    const k = keyOf(role, resource);
    commit({ ...grants, [k]: NEXT[permOf(role, resource)] });
  };

  const bulkRole = (role: string) => {
    const target = bulkNext(resources.map((res) => permOf(role, res)));
    const next = { ...grants };
    for (const res of resources) {
      next[keyOf(role, res)] = target;
    }
    commit(next);
  };

  const bulkResource = (resource: string) => {
    const target = bulkNext(roles.map((role) => permOf(role, resource)));
    const next = { ...grants };
    for (const role of roles) {
      next[keyOf(role, resource)] = target;
    }
    commit(next);
  };

  if (roles.length === 0 || resources.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-center text-muted-foreground text-xs italic",
          className,
        )}
      >
        No roles or resources
      </div>
    );
  }

  let granted = 0;
  let writes = 0;
  for (const role of roles) {
    for (const res of resources) {
      const p = permOf(role, res);
      if (p !== "none") granted++;
      if (p === "write") writes++;
    }
  }
  const total = roles.length * resources.length;

  const countsFor = (role: string) => {
    let r = 0;
    let w = 0;
    for (const res of resources) {
      const p = permOf(role, res);
      if (p === "read") r++;
      if (p === "write") w++;
    }
    return `${r}R ${w}W`;
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card text-xs", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-3 py-2 font-sans">
        <span className="text-[11px]">
          <span className="font-medium">
            {granted} of {total} granted
          </span>
          <span className="ml-1.5 text-muted-foreground">· {writes} write</span>
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>— none</span>
          <span style={{ color: PERM_META.read.color ?? undefined }}>R read</span>
          <span style={{ color: PERM_META.write.color ?? undefined }}>W write</span>
        </span>
      </div>

      <div className="overflow-x-auto p-2">
        <div
          className="grid gap-px rounded bg-border/60"
          style={{
            gridTemplateColumns: `max-content repeat(${roles.length}, minmax(64px, 1fr))`,
          }}
        >
          <div className="bg-card" />
          {roles.map((role) => (
            <button
              aria-label={`Set all for ${role}`}
              className="bg-card px-2 py-1.5 text-center font-medium font-sans transition-colors hover:bg-muted"
              key={role}
              onClick={() => bulkRole(role)}
              type="button"
            >
              {role}
            </button>
          ))}

          {resources.map((resource) => (
            <Fragment key={resource}>
              <button
                aria-label={`Set all for ${resource}`}
                className="bg-card px-2 py-1.5 text-left font-mono transition-colors hover:bg-muted"
                onClick={() => bulkResource(resource)}
                type="button"
              >
                {resource}
              </button>
              {roles.map((role) => {
                const p = permOf(role, resource);
                const meta = PERM_META[p];
                return (
                  <button
                    aria-label={`${role} on ${resource}: ${p}`}
                    className={cn(
                      "flex h-8 items-center justify-center font-medium font-mono transition-colors",
                      p === "none" ? "bg-card text-muted-foreground/50 hover:bg-muted" : "",
                    )}
                    key={role}
                    onClick={() => cycleCell(role, resource)}
                    style={
                      meta.color ? { background: `${meta.color}1f`, color: meta.color } : undefined
                    }
                    type="button"
                  >
                    {meta.label}
                  </button>
                );
              })}
            </Fragment>
          ))}

          <div className="bg-card" />
          {roles.map((role) => (
            <div
              className="bg-card px-2 py-1 text-center font-mono text-[10px] text-muted-foreground"
              key={role}
            >
              {countsFor(role)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AccessMatrix;
