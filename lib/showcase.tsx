import { ActivityFeed, type ActivityItem } from "@/components/craft/activity-feed";
import { type Alert, AlertFeed } from "@/components/craft/alert-feed";
import { type AuditEntry, AuditTrail } from "@/components/craft/audit-trail";
import { type Cohort, CohortHeatmap } from "@/components/craft/cohort-heatmap";
import { type CommentNode, CommentThread } from "@/components/craft/comment-thread";
import { type Column, DataGrid } from "@/components/craft/data-grid";
import { DiffViewer } from "@/components/craft/diff-viewer";
import { JsonInspector } from "@/components/craft/json-inspector";
import { LatencyHistogram } from "@/components/craft/latency-histogram";
import {
  type MetricAnnotation,
  MetricChart,
  type MetricSeries,
  type MetricThreshold,
} from "@/components/craft/metric-chart";
import { QueryBuilder, type QueryField, type QueryGroup } from "@/components/craft/query-builder";
import { SchemaDiagram, type SchemaTable } from "@/components/craft/schema-diagram";
import { type DayStatus, type Service, StatusGrid } from "@/components/craft/status-grid";
import { Timeline, type TimelineItem } from "@/components/craft/timeline";
import { type TraceSpan, TraceWaterfall } from "@/components/craft/trace-waterfall";
import { DataFreshnessDemo } from "@/components/showcase/data-freshness-demo";
import { LogStreamDemo } from "@/components/showcase/log-stream-demo";
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
];

export function getEntry(slug: string): ShowcaseEntry | undefined {
  return showcaseEntries.find((entry) => entry.slug === slug);
}

export function getSlugs(): string[] {
  return showcaseEntries.map((entry) => entry.slug);
}
