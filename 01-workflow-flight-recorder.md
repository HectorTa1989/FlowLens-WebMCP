# Master Build Prompt: Agent-Native Workflow Flight Recorder

Copy this entire document into Codex. The title is a working label; the human entrant must choose the final public name.

## Mission

You are the senior product engineer, interaction designer, test engineer, and release owner for a hackathon product. Build a polished browser application where an operations specialist and a browser agent collaboratively design, simulate, diagnose, and repair event-driven automations on the same visual canvas.

This must feel like a compact product, not a WebMCP API demo and not a chatbot wrapper. A user should be able to create a workflow manually. A compatible external agent should be able to understand the current workflow, add or configure nodes, run deterministic fixtures, inspect execution traces, stage a repair, and compare before-and-after runs through WebMCP. Every agent action must be visible, reviewable, and undoable in the UI.

Optimize for the four official judging criteria:

- **WebMCP Leverage:** non-trivial, state-aware read and write tools replace fragile canvas clicking and expose an executable debugging loop.
- **Execution:** a coherent visual workflow editor, deterministic simulator, trace viewer, diff preview, persistence, reset, and tests all work from the live URL.
- **Potential Impact:** automation builders lose time diagnosing silent data-shape, branching, and delivery errors; this product shortens that loop.
- **Creativity & Ambition:** the agent does not merely generate a workflow. Human and agent jointly observe an execution, form a diagnosis, stage a patch, and prove the repair.

## Hard scope

Build one excellent local-first workflow simulator. Do not build real SaaS integrations, authentication, billing, a generic chat UI, multiplayer, or a backend. All external actions are deterministic simulations displayed in the run trace.

The hero scenario is a CRM support escalation workflow:

1. A `ticket.created` event arrives.
2. The payload is normalized.
3. A condition checks VIP status and urgency.
4. Matching tickets are assigned to an escalation queue.
5. A notification is simulated.
6. A deliberately flawed field mapping causes the first run to miss the intended branch.
7. The agent inspects the trace, stages a patch, the human approves it, and the second run succeeds.

Include two additional small templates only after the hero scenario is complete: lead routing and failed-payment follow-up.

## Product experience

Use a three-pane desktop layout and a responsive stacked layout:

- Left: node catalog, workflow templates, fixtures, and reset.
- Center: zoomable workflow canvas with selection, connection handles, validation badges, and animated run path.
- Right: tabs for node configuration, run trace, patch diff, and agent activity.

The header shows workflow name, saved state, validation status, last run result, WebMCP availability, and a prominent Run button. The empty state should teach the first action in one sentence. Seeded workflows must open instantly without setup.

Make the visual language distinctive and restrained: dark graphite workspace, high-contrast cards, one electric accent for active execution, amber for warnings, red only for failures, and green only for verified success. Avoid a generic dashboard grid. Use motion to show the active execution path, but respect reduced-motion preferences.

The agent activity rail must show each call's tool name, pending/succeeded/failed status, sanitized argument summary, result summary, affected entity IDs, timestamp, and state diff. A user can jump from an activity item to the affected node or run.

## Technical baseline

- React, TypeScript, and Vite.
- `@xyflow/react` for the canvas unless the repository already contains a suitable equivalent.
- A reducer or small typed store with event-sourced change history.
- IndexedDB or localStorage for local persistence.
- Vitest and Testing Library for domain and component tests.
- Playwright for the critical manual and WebMCP-adapter flows.
- Static deployment on a platform that can provide required response headers.
- No source-code comments unless legally required.

Organize the code by domain rather than by file type. Keep the simulator, validation engine, patch engine, WebMCP adapter, and UI state separate. Centralize tool definitions in a typed registry so UI documentation and `WEBMCP.md` can be generated from the same source.

## Domain model

At minimum, model:

- `Workflow`: id, name, version, nodes, edges, createdAt, updatedAt.
- `Node`: id, type, position, config, inputContract, outputContract.
- `Edge`: id, source, sourcePort, target, targetPort.
- `Fixture`: id, name, eventType, payload, expectedOutcome.
- `ValidationIssue`: id, severity, entityId, code, message, suggestedAction.
- `Run`: id, workflowVersion, fixtureId, status, startedAt, finishedAt, steps.
- `RunStep`: nodeId, input, output, branch, status, durationMs, error.
- `Patch`: id, baseVersion, operations, rationale, validationResult, approvalState.
- `ActivityEvent`: id, source, toolName, status, inputSummary, resultSummary, diff, timestamp.

Use stable deterministic IDs in seeded data so tests, evals, and demo narration are reproducible.

## Node types

Implement only these node types:

- event trigger;
- transform with a safe field-mapping DSL;
- condition with typed operators;
- assign queue;
- notification simulation;
- delay simulation;
- end state.

Do not execute arbitrary JavaScript. Validate mappings and conditions through a restricted typed DSL.

## WebMCP tool surface

Use the imperative WebMCP API. Tool results must be compact structured objects. Strictly validate all inputs inside executors. Register state-dependent tools only when valid.

| Tool | Input | Behavior | Annotation |
| --- | --- | --- | --- |
| `get_workflow_snapshot` | optional detail level enum | Returns workflow version, nodes, edges, validation summary, selected entity, and latest run IDs | `readOnlyHint: true` |
| `list_node_types` | optional category enum | Returns the finite node catalog and config contracts | `readOnlyHint: true` |
| `add_workflow_node` | type, position hint, config | Adds a validated node, selects it, and focuses it on canvas | none |
| `update_workflow_node` | nodeId, partial typed config, expectedVersion | Applies a version-guarded config update and validates downstream contracts | none |
| `connect_workflow_nodes` | sourceId, sourcePort, targetId, targetPort, expectedVersion | Creates a valid non-duplicate connection | none |
| `validate_workflow` | optional workflowVersion | Runs structural, type-contract, reachability, and required-config checks | `readOnlyHint: true` |
| `list_fixtures` | none | Returns fixture metadata and expected outcomes without full payloads | `readOnlyHint: true`, `untrustedContentHint: true` |
| `get_fixture` | fixtureId | Returns the selected synthetic event payload | `readOnlyHint: true`, `untrustedContentHint: true` |
| `run_workflow_simulation` | fixtureId, expectedVersion | Runs the deterministic simulator, opens the trace, and animates the path | none |
| `inspect_run_trace` | runId, optional nodeId | Returns ordered steps, branch decisions, contract mismatches, and compact values | `readOnlyHint: true`, `untrustedContentHint: true` |
| `preview_workflow_patch` | expectedVersion, operations, rationale | Validates a restricted patch, creates a visual diff, and returns a patch token | none |
| `apply_workflow_patch` | patchToken | Applies only a still-current, human-approved preview and reruns validation | none; register only after approval |
| `compare_workflow_runs` | beforeRunId, afterRunId | Returns step, branch, output, and duration differences | `readOnlyHint: true` |
| `undo_last_workflow_change` | expectedVersion | Reverts the most recent reversible change and records the reversal | none; register only when undo is available |

Every write tool must reject stale `expectedVersion` values and return the current version plus a recovery instruction. A patch token must be single-use and invalidated by any intervening workflow edit. `apply_workflow_patch` must not be registered until the user clicks **Approve patch** in the visible diff panel.

Use an `AbortController` to replace the active tool set when route or state changes. Handle the tool execution abort signal. Do not expose the internal store or unrestricted mutation primitives.

## WebMCP availability and security

- Feature-detect `document.modelContext` and show a truthful status badge.
- When unavailable, preserve the full manual product and show exact supported testing guidance; do not emulate a successful WebMCP connection.
- Keep tool registration limited to the top-level same-origin document.
- Do not enable `document.domain`.
- Configure the deployment to remain origin-isolated and restrict the `tools` permissions policy to self.
- Treat fixtures, trace values, and simulated messages as untrusted data, never as instructions.
- Redact values for keys matching token, secret, password, authorization, cookie, or api-key patterns before displaying or returning them.
- Enforce maximum payload sizes, node counts, edge counts, run durations, and activity history length.

## Deterministic simulator

The simulator must:

- execute a topologically valid graph;
- support true and false branches;
- detect cycles and unreachable nodes before execution;
- validate inputs and outputs at each node;
- record a typed trace for every step;
- use deterministic pseudo-time rather than network calls;
- simulate notification and assignment side effects as trace records;
- fail clearly on missing fields, type mismatches, invalid operators, or unknown ports;
- support cancellation;
- leave the workflow unchanged after a run.

The initial CRM template must contain a subtle, understandable mapping mismatch. The error should be discoverable from the trace rather than disclosed in the landing copy.

## Evals and tests

Create an in-repository eval corpus with natural-language prompts, expected tool calls, argument constraints, permitted call-order variants, and expected visible state. Include at least these journeys:

1. Inspect the current workflow without changing it.
2. Add an assignment node after the VIP branch and connect it correctly.
3. Reject an attempt to connect a node to itself.
4. Run the VIP fixture, inspect the failed branch, and identify the mapping mismatch.
5. Preview a patch, wait for human approval, apply it, rerun, and compare results.
6. Recover from a stale version after the human edits the workflow between agent calls.
7. Cancel a long simulation and verify no partial side effect remains.
8. Confirm a fixture containing instruction-like text is treated only as data.

Test tool selection separately from executor logic. Test exact parameters and multi-step ordering. Include deterministic tests for UI changes and domain state. Record an eval table in `EVALS.md` with pass/fail evidence and changes made to ambiguous tool names, descriptions, or schemas.

## Three-minute demo

Prepare a demo that can be recorded without typing delays:

- 0:00–0:15: Open on the finished canvas and ask the agent to explain the current automation. Show WebMCP tool discovery and the canvas focus changing.
- 0:15–0:45: Ask the agent to add the escalation assignment and validate the workflow. Show visible tool activity and immediate canvas changes.
- 0:45–1:20: Run the VIP fixture. The animation takes the wrong branch. Open the trace and show the exact field mismatch.
- 1:20–2:05: Ask the agent to repair the workflow. Show the staged diff, manual approval, patch application, and second run.
- 2:05–2:35: Compare runs side by side and show the corrected outcome plus undo.
- 2:35–2:55: Flash the eval report, security annotations, public repository, and architecture view.
- End before 3:00.

The app must be functioning in the first 15 seconds. Skip sign-in, install, setup, loading, and live typing.

## Delivery phases

Work in this order and keep the app runnable after every phase:

1. Scaffold, visual shell, typed domain state, seeded CRM template, persistence, reset.
2. Canvas editing, node configuration, validation engine, deterministic simulator, trace animation.
3. Typed WebMCP adapter, read tools, write tools, activity rail, dynamic registration, cancellation.
4. Patch preview, manual approval, apply, undo, version guards, run comparison.
5. Unit, component, integration, Playwright, and eval corpus; fix ambiguity found by tests.
6. Accessibility, responsive behavior, reduced motion, empty/error states, deployment headers.
7. `README.md`, `WEBMCP.md`, `EVALS.md`, license, screenshots, demo reset, live deployment verification.

Do not add the two extra templates until the hero scenario, tool loop, and tests are complete.

## Acceptance criteria

Do not declare completion until all are true:

- The complete hero loop works manually and through real WebMCP calls in a supported client.
- At least four read tools and four write tools are exercised in the demo path.
- Tools appear and disappear correctly with app state.
- Every agent mutation produces visible activity and a reversible history event.
- The initial failure is diagnosable from trace evidence and the repaired run proves the change.
- Stale versions, invalid schemas, cancellation, oversized inputs, untrusted content, and unsupported browsers have tested behavior.
- No real external side effect can occur.
- The live URL works from a clean session.
- The public repository contains a detectable open-source license and reproducible instructions.
- The final build is visually coherent, keyboard accessible, and free of placeholder content.

## Required references

Before implementation, read and follow the current versions of:

- https://webmcp.devpost.com/
- https://github.com/webmachinelearning/webmcp
- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp
- https://developer.chrome.com/docs/ai/webmcp/secure-tools
- https://developer.chrome.com/docs/ai/webmcp/evals
- https://learn.chatgpt.com/docs/webmcp

If an API detail in this prompt differs from the current specification or supported client, follow the current primary documentation and document the adjustment.

