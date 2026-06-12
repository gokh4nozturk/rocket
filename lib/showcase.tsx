import { AccessMatrix, type Permission } from "@/components/craft/access-matrix";
import { ActivityFeed, type ActivityItem } from "@/components/craft/activity-feed";
import { type Alert, AlertFeed } from "@/components/craft/alert-feed";
import { type AuditEntry, AuditTrail } from "@/components/craft/audit-trail";
import { CalendarHeatmap, type HeatmapDay } from "@/components/craft/calendar-heatmap";
import { type Cohort, CohortHeatmap } from "@/components/craft/cohort-heatmap";
import { type CommentNode, CommentThread } from "@/components/craft/comment-thread";
import { CronBuilder } from "@/components/craft/cron-builder";
import { DataDictionary, type DictionaryColumn } from "@/components/craft/data-dictionary";
import { type Column, DataGrid } from "@/components/craft/data-grid";
import { DataLineage, type LineageEdge, type LineageNode } from "@/components/craft/data-lineage";
import { DataQuality, type QualityCheck } from "@/components/craft/data-quality";
import { DiffViewer } from "@/components/craft/diff-viewer";
import { FieldMapper, type MapperField } from "@/components/craft/field-mapper";
import { FunnelChart, type FunnelStep } from "@/components/craft/funnel-chart";
import { JsonInspector } from "@/components/craft/json-inspector";
import { JsonPathPicker } from "@/components/craft/json-path-picker";
import { LatencyHistogram } from "@/components/craft/latency-histogram";
import {
  type MetricAnnotation,
  MetricChart,
  type MetricSeries,
  type MetricThreshold,
} from "@/components/craft/metric-chart";
import { QueryBuilder, type QueryField, type QueryGroup } from "@/components/craft/query-builder";
import { RegexTester } from "@/components/craft/regex-tester";
import { type HttpRequest, RequestInspector } from "@/components/craft/request-inspector";
import { type ResourceMetric, ResourceMonitor } from "@/components/craft/resource-monitor";
import { type RoutingRule, RoutingRules } from "@/components/craft/routing-rules";
import { SchemaDiagram, type SchemaTable } from "@/components/craft/schema-diagram";
import { SloCalculator } from "@/components/craft/slo-calculator";
import { type DayStatus, type Service, StatusGrid } from "@/components/craft/status-grid";
import { Timeline, type TimelineItem } from "@/components/craft/timeline";
import { type TraceSpan, TraceWaterfall } from "@/components/craft/trace-waterfall";
import { Treemap, type TreemapNode } from "@/components/craft/treemap";
import { DataFreshnessDemo } from "@/components/showcase/data-freshness-demo";
import { LogStreamDemo } from "@/components/showcase/log-stream-demo";
import { SqlConsoleDemo } from "@/components/showcase/sql-console-demo";
import { StatTileDemo } from "@/components/showcase/stat-tile-demo";

export type ShowcaseEntry = {
  /** Route segment, e.g. "timeline". */
  slug: string;
  /** Display title, e.g. "Timeline". */
  title: string;
  /** Shown above the component. */
  description: string;
  /** Passed to getComponentSource() — the craft file name. */
  registryName: string;
  /** Rendered example. */
  demo: React.ReactNode;
};

const min = (m: number) => new Date(Date.now() - m * 60_000);

const timelineItems: TimelineItem[] = [
  {
    description: "The user session timed out due to inactivity.",
    id: "auth-timeout",
    status: "error",
    time: "Just now",
    title: "Authenticated timed out",
  },
  {
    children: [
      {
        description: "The user session timed out due to inactivity.",
        id: "cres-1",
        status: "success",
        time: "1m ago",
        title: "CRes received",
      },
      {
        children: [
          {
            description: "The user session timed out due to inactivity.",
            id: "cres-2",
            status: "success",
            time: "1m ago",
            title: "CRes received",
          },
          {
            description: "The user session timed out due to inactivity.",
            id: "creq-1",
            status: "warning",
            time: "2m ago",
            title: "CReq sent",
          },
        ],
        defaultOpen: true,
        id: "challenge-2",
        title: "Challenge performed",
      },
      {
        description: "The user session timed out due to inactivity.",
        id: "creq-2",
        status: "warning",
        time: "2m ago",
        title: "CReq sent",
      },
    ],
    id: "challenge-3",
    title: "Challenge performed",
  },
  {
    description: "Issuer requires a challenge to be performed.",
    id: "action-required",
    status: "pending",
    time: "3m ago",
    title: "Action required",
  },
  {
    children: [
      {
        description: "The user resumed an existing session.",
        id: "session-resumed",
        status: "success",
        time: "5m ago",
        title: "Session resumed",
      },
      {
        description: "The authentication flow was initiated.",
        id: "auth-started",
        status: "info",
        time: "5m ago",
        title: "Authentication started",
      },
    ],
    id: "more",
  },
  {
    description: "A new session was created for the user.",
    id: "session-created",
    status: "info",
    time: "6m ago",
    title: "Session created",
  },
];

const activityItems: ActivityItem[] = [
  {
    action: "merged",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    attachment: { kind: "quote", text: "Single SVG path — no more seams between rows." },
    id: "act-merge",
    live: true,
    target: "#42 Fix timeline connector",
    time: min(2),
    type: "merge",
  },
  {
    action: "pushed 3 commits to",
    actor: { name: "Linus Park" },
    id: "act-commit",
    target: "main",
    time: min(48),
    type: "commit",
  },
  {
    action: "commented on",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
      name: "Grace Hopper",
    },
    attachment: {
      href: "https://rocket.gozturk.dev",
      kind: "link",
      meta: "rocket.gozturk.dev",
      text: "rocket — component registry",
    },
    id: "act-comment",
    target: "#39 Docs site",
    time: min(90),
    type: "comment",
  },
  {
    action: "starred",
    actor: { name: "Margaret Hamilton" },
    id: "act-star",
    target: "gozturk/rocket",
    time: min(60 * 26),
    type: "star",
  },
  {
    action: "deployed",
    actor: { name: "Katherine Johnson" },
    id: "act-deploy",
    target: "production",
    time: min(60 * 27),
    type: "deploy",
  },
];

const comments: CommentNode[] = [
  {
    author: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    body: "Shipped the new connector — it's one continuous path now, no seams between rows. @grace can you sanity-check the mobile spacing?",
    edited: true,
    id: "c1",
    pinned: true,
    reactions: [
      { count: 4, emoji: "👍", reacted: true },
      { count: 2, emoji: "🎉" },
    ],
    replies: [
      {
        author: {
          avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
          name: "Grace Hopper",
        },
        body: "Looks great. One nit: the elbow radius feels a touch tight at the narrowest breakpoint.",
        id: "c1-1",
        reactions: [{ count: 1, emoji: "👀" }],
        replies: [
          {
            author: {
              avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
              name: "Ada Lovelace",
            },
            body: "Good catch — bumping it to 12px. This reply is flattened since it's past the depth cap.",
            id: "c1-1-1",
            time: min(20),
          },
          {
            author: { name: "Linus Park" },
            body: "+1, reads much cleaner now.",
            id: "c1-1-2",
            time: min(8),
          },
        ],
        time: min(40),
      },
    ],
    time: min(120),
  },
  {
    author: { name: "Margaret Hamilton" },
    body: "Should reactions persist to the server in this demo, or stay local for now?",
    id: "c2",
    time: min(15),
  },
];

const queryFields: QueryField[] = [
  {
    label: "Status",
    name: "status",
    options: [
      { label: "Active", value: "active" },
      { label: "Trialing", value: "trialing" },
      { label: "Churned", value: "churned" },
    ],
    type: "select",
  },
  {
    label: "Plan",
    name: "plan",
    options: [
      { label: "Free", value: "free" },
      { label: "Pro", value: "pro" },
      { label: "Team", value: "team" },
    ],
    type: "select",
  },
  { label: "Name", name: "name", type: "text" },
  { label: "MRR", name: "mrr", type: "number" },
  { label: "Signed up", name: "signedUpAt", type: "date" },
  { label: "Verified", name: "isVerified", type: "boolean" },
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

const jsonSample = {
  active: true,
  id: "usr_8x21",
  lastSeen: null,
  name: "Ada Lovelace",
  orders: [
    { id: "ord_1", items: 3, status: "shipped", total: 129.99 },
    { id: "ord_2", items: 1, status: "pending", total: 14.5 },
  ],
  profile: {
    email: "ada@analytical.engine",
    location: { city: "London", country: "UK" },
    verified: false,
  },
  roles: ["admin", "engineer"],
};

const diffBefore = {
  id: "usr_8x21",
  name: "Ada Lovelace",
  plan: "free",
  profile: { city: "London", verified: false },
  roles: ["engineer"],
  seats: 1,
};

const diffAfter = {
  id: "usr_8x21",
  name: "Ada Lovelace",
  plan: "pro",
  profile: { city: "London", country: "UK", verified: true },
  roles: ["engineer", "admin"],
};

const METRIC_T0 = Date.UTC(2026, 5, 8, 12, 0, 0);
const METRIC_STEP = 5 * 60 * 1000;
const p95Values = [62, 68, 71, 95, 120, 88, 76, 70, 132, 110, 84, 72];
const p50Values = [28, 30, 31, 35, 40, 33, 30, 29, 38, 36, 31, 30];

const metricSeries: MetricSeries[] = [
  {
    color: "#a855f7",
    key: "p95",
    label: "p95",
    points: p95Values.map((v, i) => ({ t: METRIC_T0 + i * METRIC_STEP, v })),
  },
  {
    color: "#3b82f6",
    key: "p50",
    label: "p50",
    points: p50Values.map((v, i) => ({ t: METRIC_T0 + i * METRIC_STEP, v })),
  },
];

const metricThresholds: MetricThreshold[] = [
  { label: "warning", severity: "warning", value: 90 },
  { label: "critical", severity: "critical", value: 125 },
];

const metricAnnotations: MetricAnnotation[] = [
  { description: "rolled out to prod", label: "deploy v1.4", t: METRIC_T0 + 8 * METRIC_STEP },
];

const traceSpans: TraceSpan[] = [
  { duration: 320, id: "root", name: "GET /checkout", service: "gateway", start: 0 },
  { duration: 40, id: "auth", name: "auth.verify", parentId: "root", service: "auth", start: 5 },
  {
    duration: 90,
    id: "orders",
    name: "db.query orders",
    parentId: "root",
    service: "postgres",
    start: 50,
  },
  { duration: 8, id: "cache", name: "cache.get", parentId: "orders", service: "redis", start: 52 },
  {
    duration: 70,
    id: "rows",
    name: "scan rows",
    parentId: "orders",
    service: "postgres",
    start: 62,
  },
  {
    duration: 160,
    id: "pay",
    name: "payment.charge",
    parentId: "root",
    service: "stripe",
    start: 150,
    status: "error",
  },
  {
    duration: 150,
    id: "pay-http",
    name: "POST api.stripe.com",
    parentId: "pay",
    service: "stripe",
    start: 152,
    status: "error",
  },
  {
    duration: 6,
    id: "notify",
    name: "queue.publish",
    parentId: "root",
    service: "kafka",
    start: 312,
  },
];

const latencySamples = [
  38, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 62, 63, 64, 65, 66,
  68, 70, 72, 74, 76, 78, 80, 82, 85, 88, 90, 92, 95, 98, 100, 105, 110, 115, 120, 128, 135, 142,
  150, 160, 172, 185, 200, 220, 245, 270, 300, 340, 390, 450, 520, 610,
];

const STATUS_BASE = Date.UTC(2026, 5, 9);
const STATUS_DAY_MS = 86_400_000;

function mkHistory(
  specials: Record<number, { status: Service["status"]; note?: string }>,
): DayStatus[] {
  return Array.from({ length: 90 }, (_, i) => {
    const special = specials[i];
    return {
      date: STATUS_BASE - (89 - i) * STATUS_DAY_MS,
      note: special?.note,
      status: special?.status ?? "operational",
    } satisfies DayStatus;
  });
}

const statusServices: Service[] = [
  {
    category: "API",
    history: mkHistory({}),
    id: "gateway",
    metric: "p95 142ms",
    name: "API Gateway",
    status: "operational",
    uptime: 99.98,
  },
  {
    category: "API",
    history: mkHistory({
      84: { status: "degraded" },
      85: { status: "degraded" },
      86: { note: "Elevated latency from a noisy deploy", status: "degraded" },
    }),
    id: "auth",
    metric: "p95 380ms",
    name: "Auth Service",
    status: "degraded",
    uptime: 99.41,
  },
  {
    category: "Database",
    history: mkHistory({ 40: { note: "Primary failover (12m)", status: "down" } }),
    id: "pg",
    metric: "p95 8ms",
    name: "Postgres (primary)",
    status: "operational",
    uptime: 99.99,
  },
  {
    category: "Database",
    history: mkHistory({}),
    id: "redis",
    metric: "p95 1ms",
    name: "Redis Cache",
    status: "operational",
    uptime: 100,
  },
  {
    category: "Workers",
    history: mkHistory({ 70: { status: "degraded" } }),
    id: "queue",
    metric: "lag 0.4s",
    name: "Job Queue",
    status: "operational",
    uptime: 99.95,
  },
  {
    category: "Workers",
    history: mkHistory({ 89: { note: "Planned maintenance window", status: "maintenance" } }),
    id: "cron",
    name: "Scheduler",
    status: "maintenance",
    uptime: 99.9,
  },
  {
    category: "Edge",
    history: mkHistory({}),
    id: "cdn",
    metric: "hit 98.7%",
    name: "CDN",
    status: "operational",
    uptime: 100,
  },
];

const cohortPeriods = ["Wk 0", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7"];

const cohortData: Cohort[] = [
  { label: "Jan", size: 1200, values: [1200, 720, 540, 456, 408, 372, 348, 336] },
  { label: "Feb", size: 1010, values: [1010, 626, 454, 384, 343, 313, 293] },
  { label: "Mar", size: 1420, values: [1420, 909, 696, 596, 540, 497, 469, 455] },
  { label: "Apr", size: 980, values: [980, 568, 412, 343, 304, 274] },
  { label: "May", size: 1330, values: [1330, 878, 678, 585, 532, 492] },
  { label: "Jun", size: 1150, values: [1150, 759, 587, 506, 460] },
  { label: "Jul", size: 1290, values: [1290, 877, 696, 606] },
  { label: "Aug", size: 1080, values: [1080, 778, 637] },
];

const AUDIT_BASE = Date.UTC(2026, 5, 9, 14, 0, 0);
const AUDIT_HOUR = 3_600_000;

const auditEntries: AuditEntry[] = [
  {
    action: "updated",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    changes: [
      { after: "shipped", before: "pending", field: "status" },
      { after: "DHL", before: null, field: "carrier" },
    ],
    id: "a1",
    target: "Order #1042",
    time: AUDIT_BASE - 0.5 * AUDIT_HOUR,
  },
  {
    action: "created",
    actor: { name: "Linus Park" },
    id: "a2",
    target: "User grace@acme.io",
    time: AUDIT_BASE - 2 * AUDIT_HOUR,
  },
  {
    action: "updated",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/810438?v=4",
      name: "Grace Hopper",
    },
    changes: [
      { after: 25, before: 10, field: "seats" },
      { after: "enterprise", before: "pro", field: "tier" },
    ],
    id: "a3",
    target: "Plan team-2",
    time: AUDIT_BASE - 5 * AUDIT_HOUR,
  },
  {
    action: "deleted",
    actor: {
      avatarUrl: "https://avatars.githubusercontent.com/u/124599?v=4",
      name: "Ada Lovelace",
    },
    changes: [{ before: "https://old.example.com/hook", field: "url" }],
    id: "a4",
    target: "Webhook #88",
    time: AUDIT_BASE - 26 * AUDIT_HOUR,
  },
  {
    action: "updated",
    actor: { name: "Margaret Hamilton" },
    changes: [
      { after: 99.99, before: 129.99, field: "total" },
      { after: "refunded", before: "pending", field: "status" },
    ],
    id: "a5",
    target: "Order #1039",
    time: AUDIT_BASE - 28 * AUDIT_HOUR,
  },
  {
    action: "created",
    actor: { name: "Linus Park" },
    id: "a6",
    target: "API Key prod-7",
    time: AUDIT_BASE - 30 * AUDIT_HOUR,
  },
];

const ALERT_BASE = Date.UTC(2026, 5, 9, 8, 0, 0);
const ALERT_MIN = 60_000;

const alertItems: Alert[] = [
  {
    description: "5xx rate 8.4% (threshold 1%)",
    id: "al1",
    severity: "critical",
    source: "payments",
    startedAt: ALERT_BASE - 12 * ALERT_MIN,
    status: "firing",
    title: "High error rate on /checkout",
  },
  {
    description: "98/100 connections in use",
    id: "al3",
    severity: "critical",
    source: "postgres",
    startedAt: ALERT_BASE - 4 * ALERT_MIN,
    status: "firing",
    title: "Database connections saturated",
  },
  {
    description: "p95 480ms (threshold 300ms)",
    id: "al2",
    severity: "warning",
    source: "api-gateway",
    startedAt: ALERT_BASE - 47 * ALERT_MIN,
    status: "acknowledged",
    title: "p95 latency elevated",
  },
  {
    id: "al4",
    severity: "info",
    source: "ci",
    startedAt: ALERT_BASE - 2 * ALERT_MIN,
    status: "firing",
    title: "Deploy started: rocket@1.4.0",
  },
  {
    description: "Recovered after log rotation",
    id: "al5",
    severity: "warning",
    source: "workers",
    startedAt: ALERT_BASE - 180 * ALERT_MIN,
    status: "resolved",
    title: "Disk space low on worker-3",
  },
];

const gridColumns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { facet: true, key: "plan", label: "Plan", type: "badge" },
  { align: "right", key: "mrr", label: "MRR", type: "number" },
  { facet: true, key: "status", label: "Status", type: "badge" },
  { key: "signedUp", label: "Signed up", type: "date" },
  { key: "active", label: "Active", type: "boolean" },
];

const gridRows: Record<string, unknown>[] = [
  {
    active: true,
    email: "ada@acme.io",
    id: 1,
    mrr: 499,
    name: "Ada Lovelace",
    plan: "enterprise",
    signedUp: "2025-11-02",
    status: "active",
  },
  {
    active: true,
    email: "linus@kernel.org",
    id: 2,
    mrr: 99,
    name: "Linus Park",
    plan: "pro",
    signedUp: "2026-01-14",
    status: "active",
  },
  {
    active: false,
    email: "grace@navy.mil",
    id: 3,
    mrr: 0,
    name: "Grace Hopper",
    plan: "free",
    signedUp: "2025-09-21",
    status: "churned",
  },
  {
    active: true,
    email: "margaret@nasa.gov",
    id: 4,
    mrr: 99,
    name: "Margaret Hamilton",
    plan: "pro",
    signedUp: "2026-02-08",
    status: "active",
  },
  {
    active: true,
    email: "alan@bletchley.uk",
    id: 5,
    mrr: 499,
    name: "Alan Turing",
    plan: "enterprise",
    signedUp: "2025-12-30",
    status: "active",
  },
  {
    active: false,
    email: "katherine@nasa.gov",
    id: 6,
    mrr: 29,
    name: "Katherine Johnson",
    plan: "starter",
    signedUp: "2026-03-19",
    status: "trialing",
  },
  {
    active: true,
    email: "donald@stanford.edu",
    id: 7,
    mrr: 99,
    name: "Donald Knuth",
    plan: "pro",
    signedUp: "2025-10-11",
    status: "active",
  },
  {
    active: true,
    email: "barbara@ibm.com",
    id: 8,
    mrr: 29,
    name: "Barbara Liskov",
    plan: "starter",
    signedUp: "2026-04-02",
    status: "active",
  },
  {
    active: false,
    email: "edsger@utexas.edu",
    id: 9,
    mrr: 0,
    name: "Edsger Dijkstra",
    plan: "free",
    signedUp: "2025-08-17",
    status: "churned",
  },
  {
    active: true,
    email: "john@princeton.edu",
    id: 10,
    mrr: 499,
    name: "John von Neumann",
    plan: "enterprise",
    signedUp: "2026-01-29",
    status: "active",
  },
  {
    active: true,
    email: "claude@bell.labs",
    id: 11,
    mrr: 99,
    name: "Claude Shannon",
    plan: "pro",
    signedUp: "2025-11-23",
    status: "active",
  },
  {
    active: false,
    email: "tim@w3.org",
    id: 12,
    mrr: 29,
    name: "Tim Berners-Lee",
    plan: "starter",
    signedUp: "2026-02-26",
    status: "trialing",
  },
  {
    active: true,
    email: "vint@google.com",
    id: 13,
    mrr: 499,
    name: "Vint Cerf",
    plan: "enterprise",
    signedUp: "2025-12-05",
    status: "active",
  },
  {
    active: true,
    email: "radia@sun.com",
    id: 14,
    mrr: 99,
    name: "Radia Perlman",
    plan: "pro",
    signedUp: "2026-03-08",
    status: "active",
  },
  {
    active: false,
    email: "ken@bell.labs",
    id: 15,
    mrr: 0,
    name: "Ken Thompson",
    plan: "free",
    signedUp: "2025-09-02",
    status: "churned",
  },
  {
    active: true,
    email: "dennis@bell.labs",
    id: 16,
    mrr: 29,
    name: "Dennis Ritchie",
    plan: "starter",
    signedUp: "2026-04-20",
    status: "active",
  },
];

const schemaTables: SchemaTable[] = [
  {
    columns: [
      { name: "id", pk: true, type: "uuid" },
      { name: "email", nullable: false, type: "varchar(255)", unique: true },
      { name: "name", nullable: false, type: "varchar(120)" },
      { name: "created_at", nullable: false, type: "timestamptz" },
    ],
    name: "users",
  },
  {
    columns: [
      { name: "id", pk: true, type: "uuid" },
      {
        fk: { column: "id", table: "users" },
        index: true,
        name: "user_id",
        nullable: false,
        type: "uuid",
      },
      { name: "status", nullable: false, type: "varchar(20)" },
      { name: "total", nullable: false, type: "numeric(10,2)" },
      { name: "created_at", nullable: false, type: "timestamptz" },
    ],
    name: "orders",
  },
  {
    columns: [
      { name: "id", pk: true, type: "uuid" },
      { name: "sku", nullable: false, type: "varchar(64)", unique: true },
      { name: "name", nullable: false, type: "varchar(200)" },
      { name: "price", nullable: false, type: "numeric(10,2)" },
    ],
    name: "products",
  },
  {
    columns: [
      { name: "id", pk: true, type: "uuid" },
      {
        fk: { column: "id", table: "orders" },
        index: true,
        name: "order_id",
        nullable: false,
        type: "uuid",
      },
      {
        fk: { column: "id", table: "products" },
        index: true,
        name: "product_id",
        nullable: false,
        type: "uuid",
      },
      { name: "quantity", nullable: false, type: "int" },
      { name: "unit_price", nullable: false, type: "numeric(10,2)" },
    ],
    name: "order_items",
  },
];

const lineageNodes: LineageNode[] = [
  { id: "events_raw", label: "events_raw", status: "stale", sublabel: "kafka", type: "source" },
  { id: "users", label: "users", status: "fresh", sublabel: "postgres", type: "source" },
  { id: "payments", label: "payments", status: "failed", sublabel: "stripe", type: "source" },
  { id: "stg_events", label: "stg_events", sublabel: "dbt", type: "transform" },
  { id: "dim_users", label: "dim_users", sublabel: "dbt", type: "transform" },
  { id: "fct_orders", label: "fct_orders", sublabel: "dbt", type: "transform" },
  {
    id: "revenue_dashboard",
    label: "revenue_dashboard",
    status: "fresh",
    sublabel: "looker",
    type: "output",
  },
  {
    id: "cohort_report",
    label: "cohort_report",
    status: "stale",
    sublabel: "looker",
    type: "output",
  },
];

const lineageEdges: LineageEdge[] = [
  { from: "events_raw", to: "stg_events" },
  { from: "users", to: "dim_users" },
  { from: "payments", to: "fct_orders" },
  { from: "stg_events", to: "fct_orders" },
  { from: "dim_users", to: "fct_orders" },
  { from: "fct_orders", to: "revenue_dashboard" },
  { from: "fct_orders", to: "cohort_report" },
  { from: "dim_users", to: "cohort_report" },
];

const resourceMetrics: ResourceMetric[] = [
  { critical: 90, id: "cpu", label: "CPU", unit: "%", value: 42, warn: 70 },
  { critical: 90, id: "memory", label: "Memory", unit: "%", value: 68, warn: 75 },
  { critical: 90, id: "disk", label: "Disk", unit: "%", value: 83, warn: 70 },
  { critical: 110, id: "network", label: "Network", max: 125, unit: "MB/s", value: 34, warn: 80 },
];

const demoRequest: HttpRequest = {
  method: "POST",
  requestBody: JSON.stringify({
    currency: "usd",
    customer_id: "cus_12af",
    items: [{ qty: 2, sku: "TSHIRT-M" }],
  }),
  requestHeaders: {
    accept: "application/json",
    authorization: "Bearer sk_live_••••4f9a",
    "content-type": "application/json",
    "user-agent": "acme-sdk/2.4.0",
  },
  responseBody: JSON.stringify({
    created_at: "2026-06-09T08:00:00Z",
    currency: "usd",
    id: "ord_1042",
    items: [{ price: 2999, qty: 2, sku: "TSHIRT-M" }],
    status: "created",
    total: 5998,
  }),
  responseHeaders: {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-ratelimit-remaining": "98",
    "x-request-id": "req_8Kqd3fz1",
  },
  size: 842,
  status: 201,
  statusText: "Created",
  timing: { blocked: 2, connect: 18, dns: 12, download: 9, ssl: 24, wait: 142 },
  url: "https://api.acme.io/v1/orders?expand=items&currency=usd",
};

const qualityChecks: QualityCheck[] = [
  {
    column: "id",
    id: "c1",
    kind: "unique",
    name: "unique",
    status: "pass",
    threshold: "0 dupes",
    value: "0",
  },
  {
    column: "email",
    id: "c2",
    kind: "not_null",
    message: "1,929 of 482,300 rows have a null email (0.4%); expected 0.",
    name: "not_null",
    status: "fail",
    threshold: "0%",
    value: "0.4%",
  },
  {
    column: "email",
    id: "c3",
    kind: "custom",
    message: "31 emails fail the RFC 5322 format check.",
    name: "email format",
    status: "warn",
    value: "31 invalid",
  },
  {
    column: "total",
    id: "c4",
    kind: "range",
    name: "range",
    status: "pass",
    threshold: "0–100000",
  },
  {
    column: "created_at",
    id: "c5",
    kind: "freshness",
    message: "Most recent row is 26h old; the freshness SLA is 24h.",
    name: "freshness",
    status: "fail",
    threshold: "< 24h",
    value: "26h",
  },
  {
    column: "status",
    id: "c6",
    kind: "accepted_values",
    name: "accepted_values",
    status: "pass",
    threshold: "pending|shipped|refunded",
  },
  {
    id: "c7",
    kind: "row_count",
    message: "Row count 482,300 is below the expected minimum of 500,000.",
    name: "row_count",
    status: "warn",
    threshold: "≥ 500,000",
    value: "482,300",
  },
];

const storageNodes: TreemapNode[] = [
  { category: "raw", id: "events_raw", label: "events_raw", value: 310 },
  { category: "logs", id: "logs", label: "logs", value: 156 },
  { category: "public", id: "order_items", label: "order_items", value: 124 },
  { category: "raw", id: "sessions", label: "sessions", value: 95 },
  { category: "public", id: "orders", label: "orders", value: 88 },
  { category: "logs", id: "metrics", label: "metrics", value: 64 },
  { category: "public", id: "users", label: "users", value: 42 },
  { category: "logs", id: "audit_log", label: "audit_log", value: 22 },
  { category: "public", id: "products", label: "products", value: 18 },
];

const HEATMAP_BASE = Date.UTC(2026, 2, 1);

const calendarData: HeatmapDay[] = Array.from({ length: 112 }, (_, i) => {
  const epoch = HEATMAP_BASE + i * 86_400_000;
  const weekday = new Date(epoch).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const wave = Math.sin(i / 6) * 0.5 + 0.5;
  const base = weekend ? 200 : 900;
  return {
    date: new Date(epoch).toISOString().slice(0, 10),
    value: Math.round(base * (0.4 + wave) + (i % 5) * 60),
  };
});

const funnelSteps: FunnelStep[] = [
  { id: "visited", label: "Visited", value: 24800 },
  { id: "signed_up", label: "Signed up", value: 8400 },
  { id: "activated", label: "Activated", value: 5100 },
  { id: "subscribed", label: "Subscribed", value: 1920 },
  { id: "renewed", label: "Renewed", value: 1240 },
];

const dictionaryColumns: DictionaryColumn[] = [
  {
    description: "Primary key.",
    name: "id",
    nullable: false,
    sample: ["a1b2…", "c3d4…"],
    table: "users",
    tags: ["identifier"],
    type: "uuid",
  },
  {
    description: "User email address; unique per account.",
    name: "email",
    nullable: false,
    pii: true,
    sample: ["a***@acme.io"],
    table: "users",
    tags: ["identifier"],
    type: "varchar(255)",
  },
  {
    description: "E.164 phone number collected at signup.",
    name: "phone",
    nullable: true,
    pii: true,
    sample: ["+1 ••• •• 42"],
    table: "users",
    type: "varchar(20)",
  },
  {
    description: "Subscription plan slug.",
    name: "plan",
    nullable: false,
    sample: ["free", "pro", "enterprise"],
    table: "users",
    tags: ["dimension"],
    type: "varchar(20)",
  },
  {
    description: "Order primary key.",
    name: "id",
    nullable: false,
    table: "orders",
    tags: ["identifier"],
    type: "uuid",
  },
  {
    description: "FK → users.id; the purchasing user.",
    name: "user_id",
    nullable: false,
    table: "orders",
    tags: ["identifier"],
    type: "uuid",
  },
  {
    description: "Order lifecycle state.",
    name: "status",
    nullable: false,
    sample: ["pending", "shipped", "refunded"],
    table: "orders",
    tags: ["dimension"],
    type: "varchar(20)",
  },
  {
    description: "Order total in the order currency.",
    name: "total",
    nullable: false,
    sample: ["129.99"],
    table: "orders",
    tags: ["metric"],
    type: "numeric(10,2)",
  },
  {
    name: "created_at",
    nullable: false,
    table: "orders",
    type: "timestamptz",
  },
  {
    description: "Event name, snake_case.",
    name: "event",
    nullable: false,
    sample: ["page_view", "checkout_started"],
    table: "events",
    tags: ["dimension"],
    type: "varchar(64)",
  },
  {
    description: "JSON payload of event properties.",
    name: "properties",
    nullable: true,
    table: "events",
    type: "jsonb",
  },
  {
    description: "Client timestamp of the event.",
    name: "occurred_at",
    nullable: false,
    table: "events",
    tags: ["metric"],
    type: "timestamptz",
  },
];

const mapperSourceFields: MapperField[] = [
  { name: "id", type: "int" },
  { name: "email_address", type: "string" },
  { name: "full_name", type: "string" },
  { name: "signup_date", type: "string" },
  { name: "plan_name", type: "string" },
  { name: "mrr_usd", type: "float" },
  { name: "country_code", type: "string" },
];

const mapperTargetFields: MapperField[] = [
  { name: "user_id", required: true, type: "uuid" },
  { name: "email", required: true, type: "string" },
  { name: "name", type: "string" },
  { name: "signed_up_at", type: "timestamp" },
  { name: "plan", type: "string" },
  { name: "mrr", type: "numeric" },
  { name: "country", type: "string" },
];

const routingChannels = ["pagerduty", "#oncall", "#payments", "#alerts", "email:sre@acme.io"];

const routingRulesData: RoutingRule[] = [
  {
    channel: "pagerduty",
    enabled: true,
    id: "r1",
    name: "Critical pages",
    servicePattern: "",
    severities: ["critical"],
  },
  {
    channel: "#payments",
    enabled: true,
    id: "r2",
    name: "Payments team",
    servicePattern: "payments",
    severities: [],
  },
  {
    channel: "#alerts",
    enabled: true,
    id: "r3",
    name: "Catch-all",
    servicePattern: "",
    severities: [],
  },
];

const pickerData = {
  customer: { email: "ada@acme.io", "full name": "Ada Lovelace", id: "cus_12af" },
  meta: { source: "api", version: 2 },
  orders: [
    {
      id: "ord_1042",
      items: [
        { qty: 2, sku: "TSHIRT-M" },
        { qty: 1, sku: "MUG-01" },
      ],
      total: 5998,
    },
    { id: "ord_1043", items: [{ qty: 3, sku: "STICKER" }], total: 900 },
  ],
  paid: true,
  promo: null,
};

const regexSample = [
  "2026-06-12T08:01:13Z ERROR payments timeout after 3000ms user=cus_12af",
  "2026-06-12T08:01:14Z INFO api request completed in 142ms",
  "2026-06-12T08:02:02Z ERROR checkout timeout after 5000ms user=cus_98zz",
  "2026-06-12T08:03:11Z WARN api slow response 920ms",
].join("\n");

const matrixRoles = ["admin", "analyst", "service", "viewer"];
const matrixResources = ["users", "orders", "events", "payments", "audit_log"];

const matrixGrants: Record<string, Permission> = {
  "admin:audit_log": "write",
  "admin:events": "write",
  "admin:orders": "write",
  "admin:payments": "write",
  "admin:users": "write",
  "analyst:events": "read",
  "analyst:orders": "read",
  "analyst:users": "read",
  "service:events": "write",
  "service:orders": "read",
  "viewer:orders": "read",
};

export const showcaseEntries: ShowcaseEntry[] = [
  {
    demo: <LogStreamDemo />,
    description:
      "A live-tail log stream with level filters and counts, message search, auto-scroll with a 'new lines' indicator, and expandable rows for structured detail.",
    registryName: "log-stream",
    slug: "log-stream",
    title: "Log Stream",
  },
  {
    demo: <TraceWaterfall spans={traceSpans} />,
    description:
      "A distributed-trace waterfall: an indented span tree beside time-positioned duration bars, with a time ruler, service colors, error highlighting, collapsible subtrees and hover detail.",
    registryName: "trace-waterfall",
    slug: "trace-waterfall",
    title: "Trace Waterfall",
  },
  {
    demo: <QueryBuilder defaultValue={queryDefault} fields={queryFields} />,
    description:
      "A visual, nested AND/OR query builder with a typed field schema and a read-only SQL/JSON live preview with copy.",
    registryName: "query-builder",
    slug: "query-builder",
    title: "Query Builder",
  },
  {
    demo: <Timeline items={timelineItems} />,
    description: "A nested, collapsible event timeline with one continuous connector line.",
    registryName: "timeline",
    slug: "timeline",
    title: "Timeline",
  },
  {
    demo: <JsonInspector data={jsonSample} defaultExpandedDepth={2} rootName="user" />,
    description:
      "A collapsible, searchable, code-editor-style JSON tree viewer with type coloring, line numbers, match highlighting and per-node path/value copy.",
    registryName: "json-inspector",
    slug: "json-inspector",
    title: "JSON Inspector",
  },
  {
    demo: <ActivityFeed items={activityItems} />,
    description:
      "An avatar-led activity feed with type badges, attachments, date grouping and a live indicator.",
    registryName: "activity-feed",
    slug: "activity-feed",
    title: "Activity Feed",
  },
  {
    demo: <CommentThread comments={comments} currentUser={{ name: "Katherine Johnson" }} />,
    description:
      "A threaded comment discussion with depth-capped nesting, avatar rows, reactions, replies and collapsible subtrees.",
    registryName: "comment-thread",
    slug: "comment-thread",
    title: "Comment Thread",
  },
  {
    demo: <StatTileDemo />,
    description:
      "A KPI stat tile with an animated count-up value, trend delta with semantic coloring (invertable), and a recharts sparkline with gradient fill.",
    registryName: "stat-tile",
    slug: "stat-tile",
    title: "Stat Tile",
  },
  {
    demo: <DiffViewer after={diffAfter} before={diffBefore} />,
    description:
      "A code-editor-style structural diff viewer for two JSON values, with unified/split toggle, an only-changes filter, type coloring and add/remove/change counts.",
    registryName: "diff-viewer",
    slug: "diff-viewer",
    title: "Diff Viewer",
  },
  {
    demo: (
      <MetricChart
        annotations={metricAnnotations}
        series={metricSeries}
        thresholds={metricThresholds}
        unit="ms"
      />
    ),
    description:
      "An observability time-series chart with threshold lines, event annotations, breach shading, and a crosshair tooltip with a click-to-toggle legend.",
    registryName: "metric-chart",
    slug: "metric-chart",
    title: "Metric Chart",
  },
  {
    demo: <LatencyHistogram samples={latencySamples} unit="ms" />,
    description:
      "A latency distribution histogram with p50/p95/p99 markers, percentile-zone bar coloring, hover bucket counts and a summary stat row; accepts raw samples or pre-bucketed bins.",
    registryName: "latency-histogram",
    slug: "latency-histogram",
    title: "Latency Histogram",
  },
  {
    demo: <StatusGrid services={statusServices} />,
    description:
      "A statuspage-style service health grid: category-grouped rows with current status, uptime, a per-service metric and a 90-day uptime strip, plus an overall status banner and legend.",
    registryName: "status-grid",
    slug: "status-grid",
    title: "Status Grid",
  },
  {
    demo: <CohortHeatmap cohorts={cohortData} periodLabels={cohortPeriods} />,
    description:
      "A cohort retention heatmap: cohort rows by period columns with intensity-colored cells, in-cell percentages, a column-average row, a color legend and hover detail. Accepts retained counts (+size) or raw percentages.",
    registryName: "cohort-heatmap",
    slug: "cohort-heatmap",
    title: "Cohort Heatmap",
  },
  {
    demo: <AuditTrail entries={auditEntries} />,
    description:
      "A field-level audit trail / changelog: who created/updated/deleted what, when, with old→new field diffs, action badges, date grouping, relative time, actor avatars and actor/action filters.",
    registryName: "audit-trail",
    slug: "audit-trail",
    title: "Audit Trail",
  },
  {
    demo: <AlertFeed alerts={alertItems} />,
    description:
      "An interactive alert/incident feed: severity-grouped rows with acknowledge/resolve actions, a firing-count summary banner, severity/status filters, relative duration and a collapsible resolved section.",
    registryName: "alert-feed",
    slug: "alert-feed",
    title: "Alert Feed",
  },
  {
    demo: <DataFreshnessDemo />,
    description:
      "A data-freshness / pipeline-status board: SLA-derived fresh/stale (with failed/running override), a status summary banner, a per-source SLA bar, next-run schedule, source-type icons and row counts.",
    registryName: "data-freshness",
    slug: "data-freshness",
    title: "Data Freshness",
  },
  {
    demo: <DataGrid columns={gridColumns} rows={gridRows} />,
    description:
      "A query-result data grid: type-aware cells, sortable columns, global search + faceted column filters, column visibility, row selection and pagination.",
    registryName: "data-grid",
    slug: "data-grid",
    title: "Data Grid",
  },
  {
    demo: <SchemaDiagram tables={schemaTables} />,
    description:
      "An ER / schema diagram: table cards with typed columns and PK/FK/unique/index badges, drawn FK→PK relationship lines with cardinality markers, relationship hover-highlight and collapsible tables.",
    registryName: "schema-diagram",
    slug: "schema-diagram",
    title: "Schema Diagram",
  },
  {
    demo: <SqlConsoleDemo />,
    description:
      "A SQL console/runner: a syntax-highlighted editor, Run (⌘↵) with running/success/error status, duration + row-count, a result table, an error panel and query history. Bring your own onRun executor.",
    registryName: "sql-console",
    slug: "sql-console",
    title: "SQL Console",
  },
  {
    demo: <DataLineage edges={lineageEdges} nodes={lineageNodes} />,
    description:
      "A layered data-lineage / DAG viewer: auto-laid-out source→transform→output nodes with dependency edges, direction-selectable transitive lineage tracing, node type/status indicators and an upstream/downstream impact summary.",
    registryName: "data-lineage",
    slug: "data-lineage",
    title: "Data Lineage",
  },
  {
    demo: <ResourceMonitor metrics={resourceMetrics} />,
    description:
      "A live resource monitor: per-resource 270° radial gauges with threshold zones, a history sparkline with peak/avg, a health summary banner and a pause/play live toggle. Self-updating (random walk) with a live prop.",
    registryName: "resource-monitor",
    slug: "resource-monitor",
    title: "Resource Monitor",
  },
  {
    demo: <RequestInspector request={demoRequest} />,
    description:
      "A DevTools-style HTTP request inspector: a method/url/status summary with Headers, Payload, Timing-waterfall and Response (JSON-formatted) tabs, plus copy buttons.",
    registryName: "request-inspector",
    slug: "request-inspector",
    title: "Request Inspector",
  },
  {
    demo: <DataQuality checks={qualityChecks} dataset="orders" rows={482300} />,
    description:
      "A data-quality / test report: validation checks (not_null, unique, freshness, range…) with pass/warn/fail status, a summary banner with pass-rate, status filters and expandable failure detail.",
    registryName: "data-quality",
    slug: "data-quality",
    title: "Data Quality",
  },
  {
    demo: <Treemap nodes={storageNodes} title="Storage by table" unit="GB" />,
    description:
      "A squarified treemap: value-proportional nested rectangles colored by category, with a legend and hover detail (value, % of total). Pure computed layout.",
    registryName: "treemap",
    slug: "treemap",
    title: "Treemap",
  },
  {
    demo: <CalendarHeatmap data={calendarData} unit="events" />,
    description:
      "A GitHub-contributions-style calendar heatmap: per-day values laid out as weeks × weekdays with intensity colors, month/weekday labels, a legend and hover detail. Pure UTC layout.",
    registryName: "calendar-heatmap",
    slug: "calendar-heatmap",
    title: "Calendar Heatmap",
  },
  {
    demo: <FunnelChart steps={funnelSteps} unit="users" />,
    description:
      "A conversion funnel: centered tapering step bars with counts, % of first, step-over-step drop-off connectors, an overall conversion badge and hover detail. Pure computed layout.",
    registryName: "funnel-chart",
    slug: "funnel-chart",
    title: "Funnel Chart",
  },
  {
    demo: <DataDictionary columns={dictionaryColumns} />,
    description:
      "A searchable data dictionary / catalog browser: column metadata (type, table, tags, PII, samples) with match-highlighted search, table filter chips, a PII-only toggle and expandable rows.",
    registryName: "data-dictionary",
    slug: "data-dictionary",
    title: "Data Dictionary",
  },
  {
    demo: <CronBuilder value="0 9 * * 1" />,
    description:
      "A visual cron/schedule builder: presets (minute/hourly/daily/weekly/monthly/custom) with field editors, a live expression with copy, a human-readable description, validation errors and the next 3 run times (UTC).",
    registryName: "cron-builder",
    slug: "cron-builder",
    title: "Cron Builder",
  },
  {
    demo: <FieldMapper sourceFields={mapperSourceFields} targetFields={mapperTargetFields} />,
    description:
      "An ETL field mapper: map source fields to a target schema with per-field transform selects, type-mismatch warnings, required validation, name-based auto-map and a mapping summary.",
    registryName: "field-mapper",
    slug: "field-mapper",
    title: "Field Mapper",
  },
  {
    demo: <RoutingRules channels={routingChannels} rules={routingRulesData} />,
    description:
      "An ordered, first-match-wins alert routing rules editor: per-rule severity chips, service pattern, channel, enable toggle, reorder/remove/add — plus a live dry-run tester that highlights the matching rule.",
    registryName: "routing-rules",
    slug: "routing-rules",
    title: "Routing Rules",
  },
  {
    demo: <JsonPathPicker data={pickerData} />,
    description:
      "A JSON path picker: click any node in a collapsible JSON tree to build a live JSONPath expression with breadcrumb navigation, a value preview with type info, and copy.",
    registryName: "json-path-picker",
    slug: "json-path-picker",
    title: "JSON Path Picker",
  },
  {
    demo: (
      <RegexTester
        initialPattern={"(?<service>\\w+) timeout after (?<ms>\\d+)ms"}
        initialSample={regexSample}
      />
    ),
    description:
      "A regex / log-pattern tester: pattern input with flag chips and validation errors, per-line match indicators with highlighted match spans, and a capture-group table (indexed + named) for the selected line.",
    registryName: "regex-tester",
    slug: "regex-tester",
    title: "Regex Tester",
  },
  {
    demo: <SloCalculator />,
    description:
      "An SLO / error-budget calculator: target presets + custom input and a time window produce allowed downtime (total, per-day, per-week), a request-based error budget, and a burn tracker with status.",
    registryName: "slo-calculator",
    slug: "slo-calculator",
    title: "SLO Calculator",
  },
  {
    demo: (
      <AccessMatrix defaultGrants={matrixGrants} resources={matrixResources} roles={matrixRoles} />
    ),
    description:
      "A roles × resources access-matrix editor: cells cycle none → read → write, row/column headers bulk-assign, with a live grant summary and per-role counts.",
    registryName: "access-matrix",
    slug: "access-matrix",
    title: "Access Matrix",
  },
];

export function getEntry(slug: string): ShowcaseEntry | undefined {
  return showcaseEntries.find((entry) => entry.slug === slug);
}

export function getSlugs(): string[] {
  return showcaseEntries.map((entry) => entry.slug);
}
