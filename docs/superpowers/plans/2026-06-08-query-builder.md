# Query Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual, nested AND/OR query builder craft component (`components/craft/query-builder.tsx`) that emits a query tree via `onChange` and renders a read-only SQL/JSON live preview, then wire it into the rocket registry and showcase.

**Architecture:** A single client component. Pure, SSR-safe helpers (types, operator map, immutable tree ops, `toSQL` compiler) live at the top of the file. The UI is a recursive `GroupView` rendering a left rail + AND/OR pill (blue=AND, purple=OR) with `RuleRow` children, following the existing `timeline`/`comment-thread` patterns (`"use client"`, lucide, `motion/react`, `cn`, immutable tree maps). A read-only preview panel below uses `tabs` (SQL | JSON) with copy buttons.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind, shadcn primitives (`button`, `select`, `input`, `tabs`), `lucide-react`, `motion`. Package manager: **pnpm**.

**Testing note:** This repo has **no unit-test runner** (biome only; zero existing tests). Per "don't unilaterally restructure", we do NOT add a test framework. Verification is via `pnpm exec tsc --noEmit` (types), `pnpm lint` (biome), and manual/Playwright checks against `pnpm dev`. Pure compiler logic (`toSQL`) is verified through the rendered preview with a known query in the showcase demo.

**Spec:** `docs/superpowers/specs/2026-06-08-query-builder-design.md`

---

## File Structure

- **Create:** `components/craft/query-builder.tsx` — the entire component (types, helpers, compiler, sub-views, default export `QueryBuilder`). Single file, matching the existing craft convention (one file per component).
- **Modify:** `registry.json` — add the `query-builder` item.
- **Modify:** `lib/showcase.tsx` — import, demo data, and a `showcaseEntries` entry.
- **Modify:** `lib/site.ts` — add "query builder" to `keywords` (small SEO touch).

All code lives in one craft file because `getComponentSource` reads exactly `components/craft/<registryName>.tsx` and the shadcn registry item ships exactly one file. Keeping helpers in the same file is required for the component to be self-contained when installed into a consumer app.

---

## Task 1: Types, operator map, and field helpers

**Files:**
- Create: `components/craft/query-builder.tsx`

- [ ] **Step 1: Create the file with the directive, imports, and public types**

```tsx
"use client";

import { ChevronDown, Copy, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "number" | "select" | "boolean" | "date";

export interface QueryField {
  name: string;
  label?: string;
  type: FieldType;
  /** Required for `select` fields. */
  options?: { label: string; value: string }[];
}

export interface QueryRule {
  id: string;
  field: string;
  operator: string;
  value: unknown;
}

export interface QueryGroup {
  id: string;
  combinator: "and" | "or";
  rules: QueryNode[];
}

export type QueryNode = QueryRule | QueryGroup;

export interface QueryBuilderProps {
  fields: QueryField[];
  /** Controlled value. */
  value?: QueryGroup;
  /** Uncontrolled initial value. */
  defaultValue?: QueryGroup;
  onChange?: (group: QueryGroup) => void;
  /** Max nesting depth for groups (root = 0). Default 3. */
  maxDepth?: number;
  className?: string;
}
```

- [ ] **Step 2: Add the operator map and arity model**

```tsx
type Arity = "unary" | "binary" | "multi";

interface OperatorDef {
  key: string;
  /** UI label. */
  label: string;
  /** SQL symbol or keyword. */
  sql: string;
  arity: Arity;
}

const OPERATORS: Record<FieldType, OperatorDef[]> = {
  text: [
    { arity: "unary", key: "eq", label: "equals", sql: "=" },
    { arity: "unary", key: "neq", label: "not equals", sql: "!=" },
    { arity: "unary", key: "contains", label: "contains", sql: "LIKE" },
    { arity: "unary", key: "startsWith", label: "starts with", sql: "LIKE" },
    { arity: "unary", key: "endsWith", label: "ends with", sql: "LIKE" },
  ],
  number: [
    { arity: "unary", key: "eq", label: "=", sql: "=" },
    { arity: "unary", key: "neq", label: "≠", sql: "!=" },
    { arity: "unary", key: "gt", label: ">", sql: ">" },
    { arity: "unary", key: "gte", label: "≥", sql: ">=" },
    { arity: "unary", key: "lt", label: "<", sql: "<" },
    { arity: "unary", key: "lte", label: "≤", sql: "<=" },
    { arity: "binary", key: "between", label: "between", sql: "BETWEEN" },
  ],
  date: [
    { arity: "unary", key: "eq", label: "on", sql: "=" },
    { arity: "unary", key: "before", label: "before", sql: "<" },
    { arity: "unary", key: "after", label: "after", sql: ">" },
    { arity: "binary", key: "between", label: "between", sql: "BETWEEN" },
  ],
  select: [
    { arity: "multi", key: "in", label: "is any of", sql: "IN" },
    { arity: "multi", key: "notIn", label: "is none of", sql: "NOT IN" },
    { arity: "unary", key: "eq", label: "is", sql: "=" },
    { arity: "unary", key: "neq", label: "is not", sql: "!=" },
  ],
  boolean: [{ arity: "unary", key: "is", label: "is", sql: "=" }],
};
```

- [ ] **Step 3: Add field/operator lookup and default-value helpers**

```tsx
function fieldByName(fields: QueryField[], name: string): QueryField | undefined {
  return fields.find((f) => f.name === name);
}

function operatorsFor(field: QueryField | undefined): OperatorDef[] {
  return field ? OPERATORS[field.type] : [];
}

function operatorDef(field: QueryField | undefined, key: string): OperatorDef | undefined {
  return operatorsFor(field).find((o) => o.key === key);
}

/** Default empty value for a field's first operator. */
function defaultValueFor(field: QueryField): unknown {
  const op = OPERATORS[field.type][0];
  if (field.type === "boolean") return true;
  if (op.arity === "multi") return [] as string[];
  if (op.arity === "binary") return ["", ""];
  return "";
}

/** Value reset when the operator's arity changes. */
function valueForArity(arity: Arity, type: FieldType): unknown {
  if (type === "boolean") return true;
  if (arity === "multi") return [] as string[];
  if (arity === "binary") return ["", ""];
  return "";
}
```

- [ ] **Step 4: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors). Unused-symbol warnings are fine at this stage since biome, not tsc, flags those; do not add usages just to silence — later tasks consume these.

- [ ] **Step 5: Commit**

```bash
git add components/craft/query-builder.tsx docs/superpowers
git commit -m "feat(query-builder): add types and operator map"
```

---

## Task 2: Immutable tree helpers and the SQL compiler

**Files:**
- Modify: `components/craft/query-builder.tsx`

- [ ] **Step 1: Add the node guard and immutable tree operations**

Append after the helpers from Task 1:

```tsx
function isGroup(node: QueryNode): node is QueryGroup {
  return "combinator" in node;
}

/** Immutably replace the node with `id` anywhere in the tree. */
function updateNode(
  group: QueryGroup,
  id: string,
  fn: (node: QueryNode) => QueryNode,
): QueryGroup {
  if (group.id === id) return fn(group) as QueryGroup;
  return {
    ...group,
    rules: group.rules.map((node) => {
      if (node.id === id) return fn(node);
      if (isGroup(node)) return updateNode(node, id, fn);
      return node;
    }),
  };
}

/** Immutably remove the node with `id` (never removes the root). */
function removeNode(group: QueryGroup, id: string): QueryGroup {
  return {
    ...group,
    rules: group.rules
      .filter((node) => node.id !== id)
      .map((node) => (isGroup(node) ? removeNode(node, id) : node)),
  };
}

/** Immutably append `node` to the group with `parentId`. */
function appendTo(group: QueryGroup, parentId: string, node: QueryNode): QueryGroup {
  return updateNode(group, parentId, (target) => {
    const g = target as QueryGroup;
    return { ...g, rules: [...g.rules, node] };
  });
}
```

- [ ] **Step 2: Add the SQL value formatter**

```tsx
function formatScalar(value: unknown, type: FieldType): string {
  if (type === "boolean") return value ? "TRUE" : "FALSE";
  if (type === "number") {
    const n = String(value ?? "").trim();
    return n === "" ? "NULL" : n;
  }
  // text, date, select → single-quoted, with '' escaping
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}
```

- [ ] **Step 3: Add the rule and group compilers and the public `toSQL`**

```tsx
function ruleToSQL(rule: QueryRule, fields: QueryField[]): string | null {
  const field = fieldByName(fields, rule.field);
  if (!field) return null;
  const op = operatorDef(field, rule.operator);
  if (!op) return null;
  const col = field.name;

  if (op.arity === "multi") {
    const values = Array.isArray(rule.value) ? rule.value : [];
    if (values.length === 0) return null;
    const list = values.map((v) => formatScalar(v, field.type)).join(", ");
    return `${col} ${op.sql} (${list})`;
  }

  if (op.arity === "binary") {
    const [a, b] = Array.isArray(rule.value) ? rule.value : ["", ""];
    return `${col} ${op.sql} ${formatScalar(a, field.type)} AND ${formatScalar(b, field.type)}`;
  }

  // unary
  if (op.key === "contains") return `${col} LIKE '%${String(rule.value ?? "").replace(/'/g, "''")}%'`;
  if (op.key === "startsWith") return `${col} LIKE '${String(rule.value ?? "").replace(/'/g, "''")}%'`;
  if (op.key === "endsWith") return `${col} LIKE '%${String(rule.value ?? "").replace(/'/g, "''")}'`;
  return `${col} ${op.sql} ${formatScalar(rule.value, field.type)}`;
}

function groupToSQL(group: QueryGroup, fields: QueryField[]): string | null {
  const parts = group.rules
    .map((node) => (isGroup(node) ? groupToSQL(node, fields) : ruleToSQL(node, fields)))
    .filter((p): p is string => p !== null && p !== "");
  if (parts.length === 0) return null;
  const joiner = group.combinator === "and" ? " AND " : " OR ";
  const body = parts.map((p, i) => (parts.length > 1 ? p : p)).join(joiner);
  return parts.length > 1 ? `(${body})` : body;
}

/** Compile a query tree to a read-only SQL WHERE expression. Returns "" when empty. */
export function toSQL(group: QueryGroup, fields: QueryField[]): string {
  const sql = groupToSQL(group, fields);
  if (!sql) return "";
  // Strip the outermost wrapping parens for a cleaner top-level expression.
  return sql.startsWith("(") && sql.endsWith(")") ? sql.slice(1, -1) : sql;
}
```

- [ ] **Step 4: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/craft/query-builder.tsx
git commit -m "feat(query-builder): add tree helpers and SQL compiler"
```

---

## Task 3: Value input and the rule row view

**Files:**
- Modify: `components/craft/query-builder.tsx`

- [ ] **Step 1: Add the AND/OR color tokens and a small ID counter hook**

```tsx
/** Fixed semantic accent colors for combinators. */
const RAIL = {
  and: { line: "bg-blue-500/30", pill: "bg-blue-500/15 text-blue-500" },
  or: { line: "bg-purple-500/30", pill: "bg-purple-500/16 text-purple-500" },
} as const;

/** SSR-safe incremental id factory (only called on client interactions). */
function useIdFactory() {
  const counter = useRef(0);
  return useRef(() => `qb-${++counter.current}`).current;
}
```

- [ ] **Step 2: Add the `ValueInput` sub-component**

```tsx
function ValueInput({
  field,
  op,
  value,
  onChange,
}: {
  field: QueryField;
  op: OperatorDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <Select value={value ? "true" : "false"} onValueChange={(v) => onChange(v === "true")}>
        <SelectTrigger className="h-8 w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (op.arity === "multi" && field.options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
    return (
      <div className="flex flex-wrap gap-1">
        {field.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              selected.includes(opt.value)
                ? "border-foreground/30 bg-foreground/10"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (op.arity === "unary" && field.type === "select" && field.options) {
    return (
      <Select value={String(value ?? "")} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="value" />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  if (op.arity === "binary") {
    const [a, b] = Array.isArray(value) ? (value as string[]) : ["", ""];
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type={inputType}
          value={a}
          onChange={(e) => onChange([e.target.value, b])}
          className="h-8 w-[120px]"
        />
        <span className="text-muted-foreground text-xs">and</span>
        <Input
          type={inputType}
          value={b}
          onChange={(e) => onChange([a, e.target.value])}
          className="h-8 w-[120px]"
        />
      </div>
    );
  }

  return (
    <Input
      type={inputType}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder="value"
      className="h-8 w-[150px]"
    />
  );
}
```

- [ ] **Step 3: Add the `RuleRow` sub-component**

```tsx
function RuleRow({
  rule,
  fields,
  onChange,
  onRemove,
}: {
  rule: QueryRule;
  fields: QueryField[];
  onChange: (next: QueryRule) => void;
  onRemove: () => void;
}) {
  const field = fieldByName(fields, rule.field);
  const ops = operatorsFor(field);
  const op = operatorDef(field, rule.operator) ?? ops[0];

  const onFieldChange = (name: string) => {
    const nextField = fieldByName(fields, name);
    if (!nextField) return;
    const firstOp = OPERATORS[nextField.type][0];
    onChange({ ...rule, field: name, operator: firstOp.key, value: defaultValueFor(nextField) });
  };

  const onOperatorChange = (key: string) => {
    const nextOp = operatorDef(field, key);
    if (!nextOp || !field) return;
    const arityChanged = nextOp.arity !== op.arity;
    onChange({
      ...rule,
      operator: key,
      value: arityChanged ? valueForArity(nextOp.arity, field.type) : rule.value,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
      <Select value={rule.field} onValueChange={onFieldChange}>
        <SelectTrigger className="h-8 w-[140px] font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.name} value={f.name}>
              {f.label ?? f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={rule.operator} onValueChange={onOperatorChange}>
        <SelectTrigger className="h-8 w-[130px] text-muted-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ops.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {field ? (
        <ValueInput field={field} op={op} value={rule.value} onChange={(v) => onChange({ ...rule, value: v })} />
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="ml-auto size-7 text-muted-foreground hover:text-foreground"
        aria-label="Remove condition"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (`RuleRow`/`ValueInput` unused until Task 4 — acceptable; tsc does not error on unused functions).

- [ ] **Step 5: Commit**

```bash
git add components/craft/query-builder.tsx
git commit -m "feat(query-builder): add rule row and value inputs"
```

---

## Task 4: Recursive group view with rail, AND/OR toggle, add/remove, animation

**Files:**
- Modify: `components/craft/query-builder.tsx`

- [ ] **Step 1: Add the `GroupView` recursive sub-component**

```tsx
function GroupView({
  group,
  fields,
  depth,
  maxDepth,
  newRule,
  newGroup,
  onChange,
  onRemove,
}: {
  group: QueryGroup;
  fields: QueryField[];
  depth: number;
  maxDepth: number;
  newRule: () => QueryRule;
  newGroup: () => QueryGroup;
  onChange: (next: QueryGroup) => void;
  onRemove?: () => void;
}) {
  const rail = RAIL[group.combinator];
  const toggleCombinator = () =>
    onChange({ ...group, combinator: group.combinator === "and" ? "or" : "and" });

  const updateChild = (id: string, next: QueryNode) =>
    onChange({ ...group, rules: group.rules.map((n) => (n.id === id ? next : n)) });
  const removeChild = (id: string) =>
    onChange({ ...group, rules: group.rules.filter((n) => n.id !== id) });

  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center pt-0.5">
        <button
          type="button"
          onClick={toggleCombinator}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wide transition-colors",
            rail.pill,
          )}
          aria-label={`Toggle combinator, currently ${group.combinator}`}
        >
          {group.combinator}
        </button>
        <div className={cn("my-1 w-0.5 flex-1 rounded", rail.line)} />
      </div>

      <div className="flex-1 space-y-2">
        <AnimatePresence initial={false}>
          {group.rules.map((node) => (
            <motion.div
              key={node.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isGroup(node) ? (
                <GroupView
                  group={node}
                  fields={fields}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  newRule={newRule}
                  newGroup={newGroup}
                  onChange={(next) => updateChild(node.id, next)}
                  onRemove={() => removeChild(node.id)}
                />
              ) : (
                <RuleRow
                  rule={node}
                  fields={fields}
                  onChange={(next) => updateChild(node.id, next)}
                  onRemove={() => removeChild(node.id)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {group.rules.length === 0 ? (
          <p className="px-1 py-1.5 text-muted-foreground text-xs italic">No conditions yet</p>
        ) : null}

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onChange({ ...group, rules: [...group.rules, newRule()] })}
          >
            <Plus className="size-3" /> Condition
          </Button>
          {depth < maxDepth ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-muted-foreground text-xs"
              onClick={() => onChange({ ...group, rules: [...group.rules, newGroup()] })}
            >
              <Plus className="size-3" /> Group
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="ml-auto size-7 text-muted-foreground hover:text-foreground"
              aria-label="Remove group"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/craft/query-builder.tsx
git commit -m "feat(query-builder): add recursive group view with rail and animations"
```

---

## Task 5: Read-only preview panel (SQL | JSON tabs + copy)

**Files:**
- Modify: `components/craft/query-builder.tsx`

- [ ] **Step 1: Add a copy hook and the `PreviewPanel` sub-component**

```tsx
/** Copy-to-clipboard with a transient "copied" flag. */
function useCopy() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
  };
  return { copied, copy };
}

function PreviewPanel({ group, fields }: { group: QueryGroup; fields: QueryField[] }) {
  const { copied, copy } = useCopy();
  const sql = toSQL(group, fields);
  const json = JSON.stringify(group, null, 2);
  const sqlText = sql || "-- no conditions yet";

  return (
    <Tabs defaultValue="sql" className="rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-border border-b px-2 py-1.5">
        <TabsList className="h-7 bg-transparent p-0">
          <TabsTrigger value="sql" className="h-6 px-2 text-xs">
            SQL
          </TabsTrigger>
          <TabsTrigger value="json" className="h-6 px-2 text-xs">
            JSON
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="sql" className="relative m-0">
        <CopyButton copied={copied} onCopy={() => copy(sqlText)} />
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
          <code>{sqlText}</code>
        </pre>
      </TabsContent>
      <TabsContent value="json" className="relative m-0">
        <CopyButton copied={copied} onCopy={() => copy(json)} />
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
          <code>{json}</code>
        </pre>
      </TabsContent>
    </Tabs>
  );
}

function CopyButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onCopy}
      className="absolute top-2 right-2 size-7 text-muted-foreground hover:text-foreground"
      aria-label="Copy"
    >
      {copied ? <span className="text-[10px]">✓</span> : <Copy className="size-3.5" />}
    </Button>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/craft/query-builder.tsx
git commit -m "feat(query-builder): add read-only SQL/JSON preview panel"
```

---

## Task 6: Assemble the `QueryBuilder` (controlled/uncontrolled state)

**Files:**
- Modify: `components/craft/query-builder.tsx`

- [ ] **Step 1: Add the default export that ties state + views together**

```tsx
const EMPTY_ROOT: QueryGroup = { combinator: "and", id: "root", rules: [] };

export function QueryBuilder({
  fields,
  value,
  defaultValue,
  onChange,
  maxDepth = 3,
  className,
}: QueryBuilderProps) {
  const nextId = useIdFactory();
  const [internal, setInternal] = useState<QueryGroup>(defaultValue ?? EMPTY_ROOT);
  const isControlled = value !== undefined;
  const group = isControlled ? value : internal;

  const firstField = fields[0];
  const newRule = (): QueryRule => ({
    field: firstField?.name ?? "",
    id: nextId(),
    operator: firstField ? OPERATORS[firstField.type][0].key : "eq",
    value: firstField ? defaultValueFor(firstField) : "",
  });
  const newGroup = (): QueryGroup => ({ combinator: "and", id: nextId(), rules: [] });

  const update = (next: QueryGroup) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <GroupView
        group={group}
        fields={fields}
        depth={0}
        maxDepth={maxDepth}
        newRule={newRule}
        newGroup={newGroup}
        onChange={update}
      />
      <PreviewPanel group={group} fields={fields} />
    </div>
  );
}

export default QueryBuilder;
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS. If biome reports a real lint issue (e.g. unused import, the `(p, i) => p` artifact left in `groupToSQL`), fix it. Specifically: simplify `groupToSQL`'s `body` line to `const body = parts.join(joiner);` and remove the unused index map.

- [ ] **Step 3: Apply the `groupToSQL` simplification noted above**

Replace in `groupToSQL`:

```tsx
  const joiner = group.combinator === "and" ? " AND " : " OR ";
  const body = parts.join(joiner);
  return parts.length > 1 ? `(${body})` : body;
```

- [ ] **Step 4: Re-verify**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/craft/query-builder.tsx
git commit -m "feat(query-builder): assemble controlled/uncontrolled component"
```

---

## Task 7: Wire into registry and showcase

**Files:**
- Modify: `registry.json`
- Modify: `lib/showcase.tsx`
- Modify: `lib/site.ts`

- [ ] **Step 1: Add the registry item**

In `registry.json`, add this object to the end of the `items` array (after the `comment-thread` item; add a comma after `comment-thread`'s closing brace):

```json
    {
      "name": "query-builder",
      "type": "registry:ui",
      "title": "Query Builder",
      "description": "A visual, nested AND/OR query builder with a typed field schema and a read-only SQL/JSON live preview with copy.",
      "dependencies": ["lucide-react", "motion"],
      "registryDependencies": ["button", "select", "input", "tabs"],
      "files": [
        {
          "path": "components/craft/query-builder.tsx",
          "type": "registry:ui"
        }
      ]
    }
```

- [ ] **Step 2: Add the showcase import**

In `lib/showcase.tsx`, add after the existing craft imports (keep alphabetical-ish grouping with the others):

```tsx
import { QueryBuilder, type QueryField, type QueryGroup } from "@/components/craft/query-builder";
```

- [ ] **Step 3: Add demo data above `showcaseEntries`**

Insert before `export const showcaseEntries`:

```tsx
const queryFields: QueryField[] = [
  { name: "status", label: "Status", type: "select", options: [
    { label: "Active", value: "active" },
    { label: "Trialing", value: "trialing" },
    { label: "Churned", value: "churned" },
  ] },
  { name: "plan", label: "Plan", type: "select", options: [
    { label: "Free", value: "free" },
    { label: "Pro", value: "pro" },
    { label: "Team", value: "team" },
  ] },
  { name: "name", label: "Name", type: "text" },
  { name: "mrr", label: "MRR", type: "number" },
  { name: "signedUpAt", label: "Signed up", type: "date" },
  { name: "isVerified", label: "Verified", type: "boolean" },
];

const queryDefault: QueryGroup = {
  combinator: "or",
  id: "root",
  rules: [
    {
      combinator: "and",
      id: "g1",
      rules: [
        { field: "status", id: "r1", operator: "eq", value: "active" },
        { field: "mrr", id: "r2", operator: "gt", value: "100" },
      ],
    },
    { field: "plan", id: "r3", operator: "in", value: ["pro", "team"] },
  ],
};
```

- [ ] **Step 4: Add the showcase entry**

Add as the last element of the `showcaseEntries` array:

```tsx
  {
    demo: <QueryBuilder fields={queryFields} defaultValue={queryDefault} />,
    description:
      "A visual, nested AND/OR query builder with a typed field schema and a read-only SQL/JSON live preview with copy.",
    registryName: "query-builder",
    slug: "query-builder",
    title: "Query Builder",
  },
```

- [ ] **Step 5: Add the SEO keyword**

In `lib/site.ts`, add `"query builder"` to the `keywords` array (after `"comment thread"`).

- [ ] **Step 6: Verify types and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Build the registry output**

Run: `pnpm registry:build`
Expected: completes without error; generates the `query-builder` registry JSON under the registry output dir (e.g. `public/r/query-builder.json`).

- [ ] **Step 8: Commit**

```bash
git add registry.json lib/showcase.tsx lib/site.ts public
git commit -m "feat(query-builder): register and showcase the component"
```

---

## Task 8: End-to-end verification in the running app

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server boots on http://localhost:3000 with no compile errors.

- [ ] **Step 2: Open the component page and verify rendering**

Navigate to `http://localhost:3000/query-builder` (Playwright MCP `browser_navigate`, then `browser_snapshot`).
Verify:
- The demo renders an OR group containing a nested AND group (`status equals active`, `MRR > 100`) and a `plan is any of pro, team` rule.
- The left rail pill on the outer group shows **OR** (purple), the nested group shows **AND** (blue).
- The SQL preview tab shows: `(status = 'active' AND mrr > 100) OR plan IN ('pro', 'team')`.

- [ ] **Step 3: Verify interactions**

- Click the outer **OR** pill → it flips to **AND**, rail turns blue, SQL joiner changes to `AND`.
- Click **+ Condition** on the nested group → a new row appears (animated); SQL updates.
- Change a field select to `Name` (text) → operator list switches to text operators (equals/contains/…), value becomes a text input.
- Click a row's **✕** → row removes with animation; SQL updates.
- Switch to the **JSON** tab → shows the indented `QueryGroup` tree; click copy → shows the ✓ state.
- Add a **Group** until `maxDepth` (3) is reached → the **+ Group** button disappears at the deepest level while **+ Condition** remains.

- [ ] **Step 4: Final lint/type gate**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit any fixes made during verification**

```bash
git add -A
git commit -m "fix(query-builder): verification fixes"
```

(Skip if nothing changed.)

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), operator map (Task 1), tree ops + `toSQL` (Task 2), interactions/value inputs (Task 3), rail layout + AND/OR + animation + maxDepth (Task 4), read-only SQL/JSON preview + copy (Task 5), controlled/uncontrolled API (Task 6), registry + showcase wiring (Task 7), verification (Task 8). All spec sections map to a task.
- **Out-of-scope items** from the spec (no preview-editing, no natural language, no real filtering, no drag-and-drop, SQL+JSON only) are respected — none are implemented.
- **Type consistency:** `QueryGroup`/`QueryRule`/`QueryNode`, `OperatorDef.arity`, `toSQL(group, fields)`, `isGroup`, `defaultValueFor`/`valueForArity`, `newRule`/`newGroup`, `RAIL` keys, and the `combinator: "and" | "or"` union are used consistently across all tasks.
- **No unit-test framework** is added by design (repo has none); verification is type-check + biome + browser. The pure `toSQL` is exercised by the known demo query in Task 8 Step 2.
