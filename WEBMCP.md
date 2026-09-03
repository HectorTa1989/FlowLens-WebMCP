# FlowLens WebMCP contract

This document describes the tool surface generated from `src/webmcp/catalog.ts` and implemented in `src/webmcp/tools.ts`.

## Compatibility baseline

- WebMCP Community Group draft dated August 26, 2026.
- Chrome imperative API guidance updated August 20, 2026.
- Imperative registration through `document.modelContext.registerTool`.
- Registration cleanup through `AbortSignal`.
- Execution cancellation through the callback `{ signal }` option.
- Same-origin top-level registration only.
- `Permissions-Policy: tools=(self)` in development and deployment headers.

### Observed compatibility adjustment

During verified testing, the in-app compatible browser surface supported registration, discovery, dynamic tool refresh, and execution, but its `modelContext` object did not expose EventTarget-style `addEventListener`. FlowLens therefore feature-detects `addEventListener`/`removeEventListener` independently. Tool lifecycle does not depend on receiving `toolchange`; the application reducer remains the source of truth.

The manual status is based on actual API/tool registration state. No polyfill or internal fallback is presented as WebMCP.

## Lifecycle scopes

| Scope | Registers when | Unregisters when | Tools |
| --- | --- | --- | --- |
| Page | Workspace mounts in a compatible document | Workspace unmounts | 10 base tools |
| Page/undo | Reversible history exists | History becomes empty or workspace unmounts | 1 undo tool |
| Selection | Human selects a valid node/trace range | Selection changes/clears, workflow changes, apply, reset, unmount | 4 tools |
| Approval | Human approves the current valid preview | Apply, token use/expiry, edit, selection change, reset, unmount | 1 tool |

Each scope has its own `AbortController`. Selection executors capture `runId`, `stepIds`, `nodeIds`, `selectionVersion`, and `workflowVersion` in closure state, then revalidate current state at execution time.

## Page tools

| Tool | Strict input schema | Annotation | Visible behavior / output |
| --- | --- | --- | --- |
| `get_workflow_summary` | `{ detail?: compact | nodes | runs }` | `readOnlyHint` | Returns version, bounded node/edge summary, validation, selection, latest runs |
| `list_workflow_node_types` | `{ category?: all | logic | actions | flow }` | `readOnlyHint` | Returns the seven safe node types and config contracts |
| `add_workflow_node` | `{ nodeType, x: 0..1400, y: 0..600, expectedVersion, config? }` where config is one of seven strict node-specific objects | none | Adds, focuses, persists, versions, validates, and records activity |
| `update_workflow_node` | `{ nodeId, field: condition.field, value, expectedVersion }` | none | Changes the allowlisted condition field, clears stale context, validates, records diff |
| `connect_workflow_nodes` | `{ source, sourcePort: output | true | false, target, targetPort: input, expectedVersion }` | none | Rejects self/duplicate/invalid/cycle edges; connects and records visible history |
| `validate_workflow` | `{ workflowVersion? }` | `readOnlyHint` | Returns structural/reachability/config validity and bounded issues |
| `list_workflow_fixtures` | `{}` | `readOnlyHint`, `untrustedContentHint` | Returns IDs, names, event types, expected outcomes, badges; omits payloads |
| `run_workflow_simulation` | `{ fixtureId, expectedVersion }` | none | Runs deterministic simulator, opens trace, animates path, records activity |
| `get_run_summary` | `{ runId }` | `readOnlyHint`, `untrustedContentHint` | Returns status, expected/actual outcome, branch path, failures, step IDs, duration |
| `compare_workflow_runs` | `{ beforeRunId, afterRunId }` | `readOnlyHint`, `untrustedContentHint` | Returns branch, outcome, and validation-status differences |
| `undo_last_workflow_change` | `{ expectedVersion }` | none | Conditionally registered; restores prior snapshot as a new version and reruns VIP fixture |

Every object schema sets `additionalProperties: false`, including nested patch operations and all node-specific configuration alternatives.

## Selection tools

These schemas intentionally omit selection IDs.

| Tool | Strict input schema | Annotation | Bound context / visible effect |
| --- | --- | --- | --- |
| `inspect_selected_execution` | `{ detail?: compact | values | contracts }` | `readOnlyHint`, `untrustedContentHint` | Returns bounded selected steps, inputs, outputs, branch, status, and error; focuses Trace |
| `compare_selected_path_to_baseline` | `{ baselineRunId? }` | `readOnlyHint`, `untrustedContentHint` | Compares selected run with explicit or seeded successful baseline |
| `explain_selected_contract_mismatch` | `{}` | `readOnlyHint`, `untrustedContentHint` | Returns deterministic expected/available field evidence and minimal safe change |
| `preview_fix_for_selected_failure` | `{ expectedWorkflowVersion, expectedSelectionVersion, operations: [{ op: replace_condition_field, after }], rationale }` | none | Validates a one-operation patch and opens the Patch tab without mutation |

Preview rejects a target unrelated to the selected condition, an unsafe field path, more than one operation, an unsupported operation, stale workflow, or stale selection.

## Approval tool

| Tool | Strict input schema | Annotation | Behavior |
| --- | --- | --- | --- |
| `apply_approved_workflow_patch` | `{ approvalToken: string }` | none | Revalidates token/patch/workflow/selection/expiry, applies exact preview, consumes token, records history, reruns fixture, clears old scopes, opens comparison |

The token is created only by clicking **Approve patch**. It is displayed only after approval, expires after five minutes, binds the current versions, and is single-use.

## Output and input rules

- Tool and parameter descriptions remain within current Chrome guidance budgets.
- Results serialize redacted data and are bounded to approximately 1.5 KB.
- Strings, arrays, mappings, activities, runs, selection ranges, nodes, and edges have explicit limits.
- Executor validation is independent of browser schema validation.
- Stale errors include a recovery instruction rather than silently rebasing.
- Tool annotations match behavior; mutating tools never claim `readOnlyHint`.

## Verified real-browser sequence

On August 28, 2026, the in-app compatible browser completed:

1. Dynamic registration of exactly four selection tools after selecting two trace steps.
2. `explain_selected_contract_mismatch({})` returning `customer.tier` vs `customer.segment` evidence.
3. `preview_fix_for_selected_failure(...)` returning a valid one-line non-mutating diff.
4. Confirmation that apply was absent before human approval.
5. Human approval and registration of exactly one apply tool.
6. `apply_approved_workflow_patch({ approvalToken })` returning a passed VIP rerun at workflow v8.
7. Automatic removal of selection and approval scopes after apply.
8. Conditional registration of undo.

The screenshots in `docs/screenshots/` were produced by the passing Playwright hero journey. They show manual mode because ordinary system Chrome did not expose experimental WebMCP; the real tool calls were separately verified in the compatible in-app surface.
