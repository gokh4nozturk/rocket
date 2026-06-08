import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { ActivityFeed, type ActivityItem } from "@/components/craft/activity-feed";
import { Timeline, type TimelineItem } from "@/components/craft/timeline";

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

const min = (m: number) => new Date(Date.now() - m * 60_000);

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

export default function Home() {
  return (
    <div className="flex w-full flex-col items-start gap-12 py-12">
      <div>
        <h1 className="font-medium text-foreground text-xl">rocket</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          A small component library distributed as a shadcn registry.
        </p>
      </div>

      <ComponentShowcase
        description="A nested, collapsible event timeline with one continuous connector line."
        name="timeline"
        title="Timeline"
      >
        <Timeline items={timelineItems} />
      </ComponentShowcase>

      <ComponentShowcase
        description="An avatar-led activity feed with type badges, attachments, date grouping and a live indicator."
        name="activity-feed"
        title="Activity Feed"
      >
        <ActivityFeed items={activityItems} />
      </ComponentShowcase>
    </div>
  );
}
