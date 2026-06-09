<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Component organization

This repo is a shadcn registry. Keep two component layers strictly separate:

- `components/ui/` — **shadcn primitives only** (installed/managed via the shadcn
  CLI, e.g. `avatar`, `button`). Treat these as vendored; don't hand-author new
  files here.
- `components/craft/` — **rocket's own original components** that this registry
  distributes (e.g. `timeline`, `activity-feed`). **Every new original component
  goes here**, one file per component (`components/craft/<name>.tsx`).

When adding a craft component to the registry, its `registry.json` item must point
`files[].path` at `components/craft/<name>.tsx` (keep `type: "registry:ui"` so the
shadcn CLI installs it into the *consumer's* `components/ui/`). Craft components may
import shadcn primitives from `@/components/ui/*` and helpers from `@/lib/*`; list
any shadcn primitives they use under the item's `registryDependencies`.

## Craft theme (REQUIRED)

This registry has one cohesive theme: **data & observability developer tooling** —
distinctive components for *querying, inspecting, comparing, summarizing, and
monitoring data*. Existing craft components anchor it: `query-builder`,
`json-inspector`, `diff-viewer`, `stat-tile`, `log-stream`, `metric-chart`,
`trace-waterfall`, `latency-histogram` (plus the original `timeline`,
`activity-feed`, `comment-thread`).

**Every new craft component MUST fit this theme.** Good candidates: service
health/status grids, audit trails/changelogs, cohort/retention heatmaps, query
result grids, alert/incident feeds, data-freshness indicators, schema/ER viewers,
distribution/percentile charts. **Do NOT propose or build off-theme/generic UI**
(command palettes, file uploaders, kanban boards, onboarding wizards, marketing
sections, etc.) unless they directly serve the data/observability story. When
asked for "the next craft," only offer on-theme options — don't make the user
re-state the theme.
