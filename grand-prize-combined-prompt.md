## Mission

You are the senior product engineer, interaction designer, test engineer, and release owner for a WebMCP hackathon submission.

Build a polished browser application where an operations specialist and a compatible browser agent collaboratively design, simulate, diagnose, and repair event-driven automations on the same visual workflow canvas.

Combine two ideas into one focused product:

1. A **Workflow Flight Recorder** that captures every node input, output, branch decision, validation result, simulated side effect, and failure.
2. A **selection-aware WebMCP surface** where the human's current node, failed step, or dragged trace range determines which tools are registered and what context they contain.

The defining experience is:

> The human selects the failed path. The agent understands exactly what was selected without requiring copied IDs, payloads, timestamps, or node names. The agent diagnoses the failure, stages the smallest safe patch, waits for approval, applies it, reruns the workflow, and proves the repair with a before-and-after comparison.

This must feel like a complete product, not a WebMCP API demo, an embedded chatbot, or an automation-builder clone.

## Official scoring target

Optimize every decision for the four judging criteria:

- **WebMCP Leverage:** demonstrate static tools, state-scoped tools, selection-bound tools, dynamic registration and cleanup, strict schemas, annotations, cancellation, visible state effects, version guards, preview, approval, and undo.
- **Execution:** deliver a coherent workflow editor, deterministic simulator, animated trace, selection model, patch diff, persistence, reset, tests, evals, documentation, and live deployment.
- **Potential Impact:** automation builders spend substantial time reproducing silent payload, mapping, branching, and delivery failures. This product reduces that debugging loop.
- **Creativity & Ambition:** the selected canvas path becomes an intentional typed agent context. Human attention is converted into a live tool surface rather than scraped from the DOM.

## Non-negotiable product principles

- Use ChatGPT Work, Codex, or another compatible WebMCP browser agent as the agent interface.
- Do not build an in-page chatbot or a second model integration.
- Do not assume that `toolchange` automatically causes an external agent to act.
- The human selects context, then asks the agent to act through the normal browser-agent conversation.
- Every tool call must create visible, inspectable feedback in the application.
- Every mutation must use the same domain command as the manual UI.
- No arbitrary JavaScript, unrestricted expressions, production credentials, or real external side effects.
- All assignments, notifications, delays, and deliveries are deterministic simulations.
- Keep source code free of comments unless a comment is legally required.
- Prefer a smaller flawless product over additional templates or integrations.

## Hero scenario

Ship one excellent CRM support-escalation workflow:

1. A `ticket.created` event enters the workflow.
2. A transform node normalizes its payload.
3. A condition evaluates customer tier and urgency.
4. Matching tickets are assigned to an escalation queue.
5. A notification is simulated.
6. An end node records the outcome.

The seeded workflow contains one subtle, understandable defect: the condition reads `customer.tier`, while the normalized payload produces `customer.segment`.

The seeded VIP fixture should therefore take the wrong branch without crashing. The failure must be discoverable from trace evidence rather than disclosed in the landing copy.

Include one successful baseline fixture and one failing VIP fixture. Do not add more workflows until the complete hero loop is tested and polished.

## The grand-prize interaction

After the failing simulation:

1. The trace timeline opens automatically.
2. The human drags across the normalization and condition steps or selects the red condition node.
3. The selected trace range highlights the corresponding nodes and edges on the workflow canvas.
4. The previous selection-scoped tools are unregistered.
5. New selection-scoped tools register with the selected node IDs, run ID, step IDs, bounded trace values, and workflow version captured in their closures.
6. The human asks the external agent:

   **"Why did this selected path fail? Fix it with the smallest safe change."**

7. The agent calls the selection tools; no selected IDs need to be typed.
8. The app displays evidence and focuses the mismatched fields.
9. The agent stages a restricted patch.
10. The human reviews the visual diff and clicks **Approve patch**.
11. Only then does the apply tool become available.
12. The agent applies the approved patch and reruns the same fixture.
13. The execution path animates green.
14. The app compares before and after and proves the branch and outcome changed as intended.

## Hard scope

### Build

- workflow canvas;
- finite node catalog;
- node configuration inspector;
- structural and type validation;
- deterministic workflow simulator;
- animated execution path;
- run trace and trace-range selection;
- selection-to-canvas synchronization;
- dynamic WebMCP tool lifecycle;
- tool activity rail;
- patch preview and diff;
- explicit approval gate;
- version-guarded apply;
- rerun and run comparison;
- undo;
- local persistence and one-click reset;
- unit, component, end-to-end, and agent eval tests;
- deployment and submission documentation.

### Do not build

- authentication;
- multiplayer;
- real CRM, Slack, email, queue, or webhook integrations;
- arbitrary code nodes;
- user-defined JavaScript;
- SQL;
- Supabase or another backend;
- billing;
- mobile-native applications;
- an embedded LLM or custom agent panel;
- more than one polished workflow template before submission.

## Technical baseline

- React, TypeScript, and Vite.
- `@xyflow/react` for the workflow canvas.
- A custom accessible trace timeline using semantic HTML and SVG where useful.
- A typed reducer or small event-sourced store.
- IndexedDB or localStorage for local persistence.
- Vitest and Testing Library.
- Playwright for critical workflows and tool adapter behavior.
- Static deployment on a platform that supports the required headers.
- No network dependency for the hero experience.

Suggested organization:

```text
src/
  domain/
    workflow/
    simulation/
    validation/
    patches/
  webmcp/
    registry/
    schemas/
    adapters/
    activity/
  features/
    canvas/
    inspector/
    trace/
    patch-review/
    run-comparison/
  fixtures/
  evals/
  app/
```

Centralize tool definitions in a typed registry so the application, tests, and generated `WEBMCP.md` use the same source of truth.

## Domain model

Model at least:

- `Workflow`: id, name, version, nodes, edges, createdAt, updatedAt.
- `Node`: id, type, position, config, inputContract, outputContract.
- `Edge`: id, source, sourcePort, target, targetPort.
- `Fixture`: id, name, eventType, payload, expectedOutcome.
- `ValidationIssue`: id, severity, entityId, code, message, suggestedAction.
- `Run`: id, workflowVersion, fixtureId, status, startedAt, finishedAt, steps.
- `RunStep`: id, nodeId, input, output, branch, status, durationMs, error.
- `TraceSelection`: runId, stepIds, nodeIds, startIndex, endIndex, selectionVersion.
- `Patch`: id, baseWorkflowVersion, selectionVersion, operations, rationale, validationResult, approvalState.
- `ActivityEvent`: id, source, toolName, status, inputSummary, resultSummary, entityIds, diff, timestamp.
- `HistoryEvent`: id, command, beforeVersion, afterVersion, reversible, timestamp.

Use stable deterministic IDs in fixtures so tests, evals, screenshots, and demo narration are reproducible.

## Supported node types

Implement only:

- event trigger;
- transform using a safe field-mapping DSL;
- condition using typed operators;
- assign queue simulation;
- notification simulation;
- delay simulation;
- end state.

The transform DSL can copy, rename, select, and provide default values for fields. The condition DSL can compare typed values using a finite operator allowlist. Never evaluate user-provided code.

## WebMCP lifecycle architecture

Use three registration scopes:

### Page scope

Register when the workflow workspace mounts. Abort when it unmounts.

### Selection scope

Register only when a valid node or trace selection exists. Capture immutable selection context and its workflow version. Abort the entire selection scope whenever the selection changes, clears, the workflow changes, or the selected run is deleted.

### Approval scope

Register only after the human approves a current patch preview. Abort when the patch applies, the approval is revoked, the workflow or selection changes, or the token expires.

Use `AbortController` for every scope. Handle the execution callback's abort signal. Never leave stale tools registered after a state transition.

## Page-scoped WebMCP tools

| Tool | Input | Behavior | Annotation |
| --- | --- | --- | --- |
| `get_workflow_summary` | optional detail enum | Returns workflow version, node and edge summaries, validation status, current selection summary, and latest run IDs | `readOnlyHint: true` |
| `list_workflow_node_types` | optional category enum | Returns the finite node catalog and configuration contracts | `readOnlyHint: true` |
| `add_workflow_node` | node type, position hint, typed config, expected version | Adds, selects, focuses, and validates a node | none |
| `update_workflow_node` | node ID, allowed config fields, expected version | Applies a version-guarded update and revalidates contracts | none |
| `connect_workflow_nodes` | source, source port, target, target port, expected version | Creates a valid non-duplicate connection | none |
| `validate_workflow` | optional workflow version | Runs structural, reachability, configuration, and type-contract checks | `readOnlyHint: true` |
| `list_workflow_fixtures` | none | Returns fixture metadata and expected outcomes without full payloads | `readOnlyHint: true`, `untrustedContentHint: true` |
| `run_workflow_simulation` | fixture ID, expected workflow version | Runs the deterministic simulator, opens the trace, and animates the path | none |
| `get_run_summary` | run ID | Returns compact status, branch path, failures, outcome, and step IDs | `readOnlyHint: true`, `untrustedContentHint: true` |
| `compare_workflow_runs` | before run ID, after run ID | Returns branch, step, output, validation, and duration differences | `readOnlyHint: true`, `untrustedContentHint: true` |
| `undo_last_workflow_change` | expected workflow version | Reverts the latest reversible change and records the reversal | none; register only when undo is available |

## Selection-scoped WebMCP tools

These tools must be bound to the selection through closure state. Their schemas should not ask the agent to repeat selected IDs.

| Tool | Input | Behavior | Annotation |
| --- | --- | --- | --- |
| `inspect_selected_execution` | optional detail enum | Returns selected nodes and steps, bounded inputs and outputs, branch decisions, contract mismatches, and nearby context | `readOnlyHint: true`, `untrustedContentHint: true` |
| `compare_selected_path_to_baseline` | optional baseline run ID | Compares the selected range to the successful seeded run or another compatible run | `readOnlyHint: true`, `untrustedContentHint: true` |
| `explain_selected_contract_mismatch` | none | Returns deterministic field-path and type-contract evidence for the selected failure | `readOnlyHint: true`, `untrustedContentHint: true` |
| `preview_fix_for_selected_failure` | expected workflow version, expected selection version, restricted operations, rationale | Validates a minimal patch and opens a visual diff without changing the workflow | none |

The app provides evidence; the external agent performs interpretation. Do not add an internal model call inside these tools.

`preview_fix_for_selected_failure` accepts only the restricted patch DSL and must reject changes unrelated to the selected nodes unless explicitly justified and permitted.

## Approval-scoped WebMCP tool

| Tool | Input | Behavior | Annotation |
| --- | --- | --- | --- |
| `apply_approved_workflow_patch` | single-use approval token | Revalidates and applies only the currently approved patch, records history, reruns validation, and invalidates the token | none |

The approval token must:

- be created only by the visible human approval action;
- bind patch ID, workflow version, selection version, and expiry;
- be single-use;
- expire after any relevant edit;
- never be returned by a read tool before approval;
- fail safely with a recovery instruction when stale.

## Tool contract rules

- Use snake-case names and concise action-specific descriptions.
- Use strict JSON Schemas with `additionalProperties: false`.
- Prefer enums and stable IDs over free-form strings.
- Bound every string, array, payload, result set, and trace range.
- Revalidate all inputs inside executors.
- Reject stale workflow, run, selection, patch, and approval versions.
- Return compact structured data and stable entity IDs.
- Never return the whole store or unrestricted raw payloads.
- Correctly mark read tools with `readOnlyHint`.
- Mark fixtures, payloads, traces, and simulated messages with `untrustedContentHint`.
- Redact fields whose keys resemble secrets, tokens, passwords, cookies, authorization headers, or API keys.
- Keep tool behavior identical to its name, description, annotation, and visible UI effect.

## Visual experience

Use a three-pane desktop layout and a responsive stacked layout:

- Left: node catalog, fixtures, seeded baseline, reset.
- Center: workflow canvas and selectable execution path.
- Right: tabs for node inspector, run trace, patch diff, comparison, and activity.

The trace must support:

- click selection of one step;
- shift-click expansion;
- drag selection of a contiguous range;
- keyboard selection and expansion;
- synchronization with canvas nodes and edges;
- a visible selection-context banner;
- a visible count of currently registered page, selection, and approval tools;
- clear tool-registration and unregistration events in the activity rail.

The visual language should use dark graphite surfaces, crisp typography, one electric accent for active execution, amber for warnings, red only for verified failures, and green only for verified success. Respect reduced-motion preferences and never rely on color alone.

Every agent tool call should show:

- tool name;
- pending, success, failure, or cancelled status;
- sanitized argument summary;
- result summary;
- affected entities;
- state diff;
- timestamp;
- undo link when applicable.

## Deterministic simulator

The simulator must:

- execute a structurally valid directed workflow;
- support true and false branches;
- reject cycles and unreachable required nodes;
- validate each node's input and output contracts;
- record every step in a typed trace;
- use deterministic pseudo-time;
- simulate side effects as trace records only;
- detect missing fields, type mismatches, invalid operators, and unknown ports;
- support cancellation;
- leave workflow configuration unchanged after a run.

The successful baseline and failing VIP fixture must always produce the same traces before a workflow edit.

## Security and browser behavior

- Feature-detect `document.modelContext`.
- Show a truthful WebMCP status and unsupported-browser panel.
- Preserve the complete manual product when WebMCP is unavailable.
- Never claim the fallback is WebMCP.
- Do not enable `document.domain`.
- Restrict the `tools` permissions policy to self.
- Keep tool registration in the top-level same-origin document.
- Treat all event payloads and trace strings as untrusted data, never instructions.
- Enforce maximum workflows, nodes, edges, fixture size, run steps, selection length, patch operations, and activity history.
- Avoid production credentials and network access in the hero demo.

## Tests and evals

Create deterministic automated tests and an agent-facing eval corpus.

Required eval journeys:

1. Summarize the workflow without mutating it.
2. Add and connect an assignment node with valid version guards.
3. Reject a self-connection, duplicate edge, invalid port, and cycle.
4. Run the VIP fixture and observe the wrong branch.
5. Select the failed trace range and verify that only selection-scoped tools appear.
6. Ask why the selected path failed and expect `inspect_selected_execution` followed by the deterministic mismatch tool.
7. Preview the smallest patch for the selected failure.
8. Verify that no apply tool exists before human approval.
9. Approve, apply, rerun, and compare before and after.
10. Clear the selection and verify all selection tools disappear.
11. Edit the workflow after preview and verify the old selection and patch become stale.
12. Cancel a simulation and verify that no partial simulated side effect remains.
13. Include instruction-like fixture content and verify it remains untrusted data.
14. Undo the patch and verify the original deterministic failure returns.

Test separately:

- tool selection;
- exact arguments;
- permitted order variants;
- executor logic;
- UI focus and visible state changes;
- dynamic registration and cleanup;
- cancellation;
- stale-version recovery;
- approval-token expiry and reuse;
- redaction;
- unsupported browsers;
- persistence and reset.

Create `EVALS.md` with prompt, expected calls, actual calls, result, screenshots or trace evidence, and contract refinements made after failures.

## Grand-prize demo script

- **0:00–0:15:** Start on the completed workflow with the failing VIP run already visible. Select the red trace range. Show the selection banner and selection-tool count changing.
- **0:15–0:35:** Ask: "Why did this selected path fail? Fix it with the smallest safe change."
- **0:35–1:00:** The external agent calls the selection inspection and mismatch tools. The app focuses `customer.tier` versus `customer.segment` in the trace.
- **1:00–1:25:** The agent calls the patch-preview tool. Show a one-line mapping diff and validation result.
- **1:25–1:40:** Human clicks **Approve patch**. Show the approval-scoped apply tool appear.
- **1:40–2:00:** The agent applies the patch and reruns the same VIP fixture.
- **2:00–2:20:** The execution path animates green and reaches the escalation outcome.
- **2:20–2:38:** Compare runs side by side: branch, assignment, notification, and validation result.
- **2:38–2:50:** Clear the selection and show the selection tools disappear. Briefly show undo.
- **2:50–2:58:** Flash `WEBMCP.md`, `EVALS.md`, green tests, public repository, license, and live URL.

The product must visibly work in the first 15 seconds. Do not show sign-in, setup, package installation, loading screens, or live typing.

## Six-day delivery plan

### Day 1: Product skeleton

- Scaffold the app.
- Implement typed domain state.
- Seed the hero workflow and fixtures.
- Build the three-pane shell, persistence, and reset.

### Day 2: Workflow and simulation

- Build canvas editing and node inspector.
- Implement validation and safe DSLs.
- Implement deterministic simulation and trace records.

### Day 3: Selection and WebMCP

- Build trace selection and canvas synchronization.
- Implement the typed WebMCP adapter.
- Add page-scoped and selection-scoped tools.
- Add activity and lifecycle visualization.

### Day 4: Repair loop

- Implement restricted patch preview.
- Add human approval and approval-scoped apply.
- Add rerun, comparison, version guards, and undo.

### Day 5: Verification and polish

- Add unit, component, Playwright, and agent eval coverage.
- Fix ambiguous tool descriptions and schemas.
- Polish accessibility, responsive behavior, reduced motion, and error states.

### Day 6: Submission readiness

- Deploy and verify in supported clients.
- Record the demo.
- Finish README, architecture, tool inventory, eval report, testing instructions, screenshots, and Devpost description.
- Preserve buffer for client-specific WebMCP fixes.

Do not spend Day 6 adding features.

## Required repository documents

- `README.md`: problem, product, setup, demo, deployment, supported clients, limitations.
- `WEBMCP.md`: every tool, schema, annotation, registration scope, availability rule, side effect, and screenshot.
- `EVALS.md`: eval prompts, expected and actual calls, failures, refinements, and final results.
- `ARCHITECTURE.md`: domain boundaries, simulator, event history, tool lifecycle, selection binding, approval model.
- `SECURITY.md`: trust boundaries, untrusted content, redaction, approval, limits, and non-goals.
- `LICENSE`: a detectable open-source license.

## Acceptance criteria

Do not declare completion until all are true:

- The complete hero loop works manually and through real WebMCP calls in a supported browser agent.
- Selecting a node or trace range registers context-bound tools without requiring repeated IDs.
- Changing or clearing selection reliably unregisters those tools.
- The failing fixture is diagnosable from trace evidence.
- The patch preview is minimal, validated, visible, and non-mutating.
- No patch can apply without a current human approval token.
- The repaired run deterministically proves the corrected branch and outcome.
- Before-and-after comparison is clear in under ten seconds.
- Every mutation is visible, attributed, version guarded, and reversible where appropriate.
- Untrusted data, stale state, cancellation, oversized input, unsupported browsers, and token misuse have tested behavior.
- No real external side effect can occur.
- The live URL works in a clean supported session.
- The repository is public, reproducible, licensed, documented, and free of placeholder content.

## Final build discipline

- Inspect the repository before changing it.
- Preserve existing user work.
- Keep the application runnable after every phase.
- Run relevant tests after each meaningful change.
- Fix root causes rather than hiding errors.
- Do not add dependencies without a clear need.
- Do not expand scope without removing something of equal cost.
- Report blockers honestly.
- Never fake WebMCP calls, tool traces, eval results, screenshots, or demo behavior.

## Primary references

Before implementing, read the current versions of:

- https://webmcp.devpost.com/
- https://github.com/webmachinelearning/webmcp
- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp
- https://developer.chrome.com/docs/ai/webmcp/secure-tools
- https://developer.chrome.com/docs/ai/webmcp/evals
- https://learn.chatgpt.com/docs/webmcp
- https://developers.openai.com/showcase?view=webmcp-apps

If this prompt conflicts with the current specification or supported-client behavior, follow the current primary documentation and record the adjustment in `WEBMCP.md`.
