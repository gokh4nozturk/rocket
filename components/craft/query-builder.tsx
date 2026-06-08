"use client";

import { Copy, Plus, X } from "lucide-react";
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
  value?: QueryGroup;
  defaultValue?: QueryGroup;
  onChange?: (group: QueryGroup) => void;
  maxDepth?: number;
  className?: string;
}

type Arity = "unary" | "binary" | "multi";

interface OperatorDef {
  key: string;
  label: string;
  sql: string;
  arity: Arity;
}

const OPERATORS: Record<FieldType, OperatorDef[]> = {
  boolean: [{ arity: "unary", key: "is", label: "is", sql: "=" }],
  date: [
    { arity: "unary", key: "eq", label: "on", sql: "=" },
    { arity: "unary", key: "before", label: "before", sql: "<" },
    { arity: "unary", key: "after", label: "after", sql: ">" },
    { arity: "binary", key: "between", label: "between", sql: "BETWEEN" },
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
  select: [
    { arity: "multi", key: "in", label: "is any of", sql: "IN" },
    { arity: "multi", key: "notIn", label: "is none of", sql: "NOT IN" },
    { arity: "unary", key: "eq", label: "is", sql: "=" },
    { arity: "unary", key: "neq", label: "is not", sql: "!=" },
  ],
  text: [
    { arity: "unary", key: "eq", label: "equals", sql: "=" },
    { arity: "unary", key: "neq", label: "not equals", sql: "!=" },
    { arity: "unary", key: "contains", label: "contains", sql: "LIKE" },
    { arity: "unary", key: "startsWith", label: "starts with", sql: "LIKE" },
    { arity: "unary", key: "endsWith", label: "ends with", sql: "LIKE" },
  ],
};

function fieldByName(fields: QueryField[], name: string): QueryField | undefined {
  return fields.find((f) => f.name === name);
}

function operatorsFor(field: QueryField | undefined): OperatorDef[] {
  return field ? OPERATORS[field.type] : [];
}

function operatorDef(field: QueryField | undefined, key: string): OperatorDef | undefined {
  return operatorsFor(field).find((o) => o.key === key);
}

function defaultValueFor(field: QueryField): unknown {
  const op = OPERATORS[field.type][0];
  if (field.type === "boolean") return true;
  if (op.arity === "multi") return [] as string[];
  if (op.arity === "binary") return ["", ""];
  return "";
}

function valueForArity(arity: Arity, type: FieldType): unknown {
  if (type === "boolean") return true;
  if (arity === "multi") return [] as string[];
  if (arity === "binary") return ["", ""];
  return "";
}

function isGroup(node: QueryNode): node is QueryGroup {
  return "combinator" in node;
}

function formatScalar(value: unknown, type: FieldType): string {
  if (type === "boolean") return value ? "TRUE" : "FALSE";
  if (type === "number") {
    const n = String(value ?? "").trim();
    return n === "" ? "NULL" : n;
  }
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

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

  if (op.key === "contains")
    return `${col} LIKE '%${String(rule.value ?? "").replace(/'/g, "''")}%'`;
  if (op.key === "startsWith")
    return `${col} LIKE '${String(rule.value ?? "").replace(/'/g, "''")}%'`;
  if (op.key === "endsWith")
    return `${col} LIKE '%${String(rule.value ?? "").replace(/'/g, "''")}'`;
  return `${col} ${op.sql} ${formatScalar(rule.value, field.type)}`;
}

function groupToSQL(group: QueryGroup, fields: QueryField[]): string | null {
  const parts = group.rules
    .map((node) => (isGroup(node) ? groupToSQL(node, fields) : ruleToSQL(node, fields)))
    .filter((p): p is string => p !== null && p !== "");
  if (parts.length === 0) return null;
  const joiner = group.combinator === "and" ? " AND " : " OR ";
  const body = parts.join(joiner);
  return parts.length > 1 ? `(${body})` : body;
}

export function toSQL(group: QueryGroup, fields: QueryField[]): string {
  const sql = groupToSQL(group, fields);
  if (!sql) return "";
  return sql.startsWith("(") && sql.endsWith(")") ? sql.slice(1, -1) : sql;
}

const RAIL = {
  and: { line: "bg-blue-500/30", pill: "bg-blue-500/15 text-blue-500" },
  or: { line: "bg-purple-500/30", pill: "bg-purple-500/16 text-purple-500" },
} as const;

function useIdFactory() {
  const counter = useRef(0);
  return useRef(() => `qb-${++counter.current}`).current;
}

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
      <Select onValueChange={(v) => onChange(v === "true")} value={value ? "true" : "false"}>
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
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              selected.includes(opt.value)
                ? "border-foreground/30 bg-foreground/10"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted",
            )}
            key={opt.value}
            onClick={() => toggle(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (op.arity === "unary" && field.type === "select" && field.options) {
    return (
      <Select onValueChange={onChange} value={String(value ?? "")}>
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
          className="h-8 w-[120px]"
          onChange={(e) => onChange([e.target.value, b])}
          type={inputType}
          value={a}
        />
        <span className="text-muted-foreground text-xs">and</span>
        <Input
          className="h-8 w-[120px]"
          onChange={(e) => onChange([a, e.target.value])}
          type={inputType}
          value={b}
        />
      </div>
    );
  }

  return (
    <Input
      className="h-8 w-[150px]"
      onChange={(e) => onChange(e.target.value)}
      placeholder="value"
      type={inputType}
      value={String(value ?? "")}
    />
  );
}

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

  const onFieldChange = (name: string | null) => {
    if (!name) return;
    const nextField = fieldByName(fields, name);
    if (!nextField) return;
    const firstOp = OPERATORS[nextField.type][0];
    onChange({ ...rule, field: name, operator: firstOp.key, value: defaultValueFor(nextField) });
  };

  const onOperatorChange = (key: string | null) => {
    if (!key) return;
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
      <Select onValueChange={onFieldChange} value={rule.field}>
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

      <Select onValueChange={onOperatorChange} value={rule.operator}>
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
        <ValueInput
          field={field}
          onChange={(v) => onChange({ ...rule, value: v })}
          op={op}
          value={rule.value}
        />
      ) : null}

      <Button
        aria-label="Remove condition"
        className="ml-auto size-7 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

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
          aria-label={`Toggle combinator, currently ${group.combinator}`}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wide transition-colors",
            rail.pill,
          )}
          onClick={toggleCombinator}
          type="button"
        >
          {group.combinator}
        </button>
        <div className={cn("my-1 w-0.5 flex-1 rounded", rail.line)} />
      </div>

      <div className="flex-1 space-y-2">
        <AnimatePresence initial={false}>
          {group.rules.map((node) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0 }}
              initial={{ opacity: 0, y: -4 }}
              key={node.id}
              layout
              transition={{ duration: 0.15 }}
            >
              {isGroup(node) ? (
                <GroupView
                  depth={depth + 1}
                  fields={fields}
                  group={node}
                  maxDepth={maxDepth}
                  newGroup={newGroup}
                  newRule={newRule}
                  onChange={(next) => updateChild(node.id, next)}
                  onRemove={() => removeChild(node.id)}
                />
              ) : (
                <RuleRow
                  fields={fields}
                  onChange={(next) => updateChild(node.id, next)}
                  onRemove={() => removeChild(node.id)}
                  rule={node}
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
            className="h-7 gap-1 text-xs"
            onClick={() => onChange({ ...group, rules: [...group.rules, newRule()] })}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="size-3" /> Condition
          </Button>
          {depth < maxDepth ? (
            <Button
              className="h-7 gap-1 text-muted-foreground text-xs"
              onClick={() => onChange({ ...group, rules: [...group.rules, newGroup()] })}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Plus className="size-3" /> Group
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              aria-label="Remove group"
              className="ml-auto size-7 text-muted-foreground hover:text-foreground"
              onClick={onRemove}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      aria-label="Copy"
      className="absolute top-2 right-2 size-7 text-muted-foreground hover:text-foreground"
      onClick={() => copy(text)}
      size="icon"
      type="button"
      variant="ghost"
    >
      {copied ? <span className="text-[10px]">✓</span> : <Copy className="size-3.5" />}
    </Button>
  );
}

function PreviewPanel({ group, fields }: { group: QueryGroup; fields: QueryField[] }) {
  const sql = toSQL(group, fields);
  const json = JSON.stringify(group, null, 2);
  const sqlText = sql || "-- no conditions yet";

  return (
    <Tabs className="rounded-lg border border-border bg-muted/30" defaultValue="sql">
      <div className="flex items-center justify-between border-border border-b px-2 py-1.5">
        <TabsList className="h-7 bg-transparent p-0">
          <TabsTrigger className="h-6 px-2 text-xs" value="sql">
            SQL
          </TabsTrigger>
          <TabsTrigger className="h-6 px-2 text-xs" value="json">
            JSON
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent className="relative m-0" value="sql">
        <CopyButton text={sqlText} />
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
          <code>{sqlText}</code>
        </pre>
      </TabsContent>
      <TabsContent className="relative m-0" value="json">
        <CopyButton text={json} />
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
          <code>{json}</code>
        </pre>
      </TabsContent>
    </Tabs>
  );
}

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
        depth={0}
        fields={fields}
        group={group}
        maxDepth={maxDepth}
        newGroup={newGroup}
        newRule={newRule}
        onChange={update}
      />
      <PreviewPanel fields={fields} group={group} />
    </div>
  );
}

export default QueryBuilder;
