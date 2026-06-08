import { ActivityFeed, type ActivityItem } from "@/components/craft/activity-feed";
import { type CommentNode, CommentThread } from "@/components/craft/comment-thread";
import { JsonInspector } from "@/components/craft/json-inspector";
import { QueryBuilder, type QueryField, type QueryGroup } from "@/components/craft/query-builder";
import { Timeline, type TimelineItem } from "@/components/craft/timeline";

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

export const showcaseEntries: ShowcaseEntry[] = [
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
];

export function getEntry(slug: string): ShowcaseEntry | undefined {
  return showcaseEntries.find((entry) => entry.slug === slug);
}

export function getSlugs(): string[] {
  return showcaseEntries.map((entry) => entry.slug);
}
