import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

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

export default function Home() {
  return (
    <div className="container grid h-full min-h-[calc(100dvh-5rem)] items-start gap-12 divide-x-2 bg-red-400 py-8 lg:grid-cols-[1fr_3fr_1fr]">
      <aside>
        <h1 className="font-medium text-foreground text-xl">shadcn registry</h1>
      </aside>
      <div className="flex w-full flex-col items-start gap-12">
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
      </div>
      <aside>
        <h1 className="font-medium text-foreground text-xl">shadcn registry</h1>
      </aside>
    </div>
  );
}
