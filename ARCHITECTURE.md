# FlowLens architecture

## System shape

FlowLens is a static React application. The hero experience requires no backend, credentials, model API, or network request.

```text
Human or browser agent
        │
        ▼
Visible UI / WebMCP adapter
        │
        ▼
Typed application commands
        │
        ├── workflow validator
        ├── deterministic simulator
        ├── restricted patch engine
        └── event/history recorder
        │
        ▼
Reducer state + bounded local persistence
```

Manual actions and WebMCP mutations share the same store commands. The agent adapter is not a second business-logic implementation.

## Domain boundaries

### Workflow

`src/domain/types.ts` defines the stable workflow, node, edge, fixture, validation, run, trace, selection, patch, approval, activity, and history records. IDs in `src/domain/fixtures.ts` are deterministic so tests and demo narration can address stable entities.

The catalog is finite: event, transform, condition, assign, notification, delay, and end. Configuration is data, never executable code.

### Validation

`src/domain/validation.ts` rejects self-connections, duplicate edges, unknown nodes, invalid ports, cycles, missing triggers, unreachable nodes, and invalid transform/condition configuration. A draft containing unreachable nodes can be displayed and edited, but it cannot simulate.

### Simulator

`src/domain/simulation.ts` traverses a structurally valid directed graph. Each node produces a trace step containing bounded input, output, branch, status, error, duration, and pseudo-timestamp.

- Transform supports safe nested field copy/rename/default operations.
- Condition supports `equals`, `not_equals`, and `exists` only.
- Assign, notification, delay, and end produce trace data only.
- No real queue, notification, delivery, timer, or network operation can occur.
- Abort before or during traversal returns a cancelled run without a partial real side effect.

### Repair engine

`src/domain/patches.ts` accepts one restricted operation in the hero flow: `replace_condition_field`. Preview builds a candidate workflow, validates it, and returns a diff without changing current state.

Approval binds:

- patch ID;
- workflow version;
- selection version;
- five-minute expiry;
- single-use state.

Apply revalidates every binding, creates a new workflow version, records reversible history, consumes approval, reruns the same fixture, clears stale selection tools, and opens comparison.

## Application state

`src/app/store.tsx` is a typed reducer plus command facade. It owns all domain state and exposes the same commands to React components and WebMCP executors.

Bounded limits:

- 20 nodes;
- 30 edges;
- 30 retained runs;
- 12 selected trace steps;
- 20 history entries;
- 100 activity events;
- one patch operation in the hero repair.

Workflow and local persona persist under `flowlens-state-v1`. Invalid drafts hydrate safely without trying to simulate until validation passes. Reset restores the stable seeded workflow, fixtures, runs, and admin persona.

## WebMCP lifecycle

`src/webmcp/tools.ts` contains canonical schemas and executors. `src/webmcp/useWebMCP.ts` owns registration lifecycle.

```text
Workspace mount ── page controller ── 10 base tools
History exists ─── undo controller ── 1 conditional tool
Selection set ──── selection controller ── 4 closure-bound tools
Human approves ─── approval controller ── 1 single-use apply tool
```

Selection change, workflow edit, apply, clear, or component unmount aborts the prior scope. Every executor rechecks current versions even though the selection is captured in closure state.

## UI composition

- Left: finite node library, fixtures, run trigger, recorder summary, reset.
- Center: React Flow workflow canvas, executed/selected path styling, selection banner, minimap.
- Right: inspector, trace timeline, patch review, comparison, and tool activity.

The trace supports click, shift-click expansion, pointer drag across a contiguous range, Enter/Space selection, and Shift+Arrow keyboard expansion. Selection updates canvas nodes and edges through shared state.

## Polar boundary

`src/features/paywall/Paywall.tsx` uses `@polar-sh/checkout` with a public persistent Checkout Link. It never holds a Polar organization token. `HectorTa1989` is a local demo admin bypass; guest users encounter the hosted checkout gate for Pro features.

Production entitlement synchronization intentionally remains outside this static architecture and requires trusted authentication plus verified Polar state.
