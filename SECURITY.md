# FlowLens security model

## Trust boundaries

FlowLens treats fixture payloads, trace strings, simulated notifications, and browser-agent inputs as untrusted data. They are evidence, never instructions.

The application has four principal boundaries:

1. Human-visible UI.
2. Browser agent and WebMCP calls.
3. Typed local domain commands.
4. Polar hosted checkout.

No browser agent call bypasses the domain-command layer. No Polar secret exists in the client.

## Mutation safety

- All mutations are visible in the canvas, panel state, or activity rail.
- Workflow mutations require the expected current workflow version.
- Selection tools contain immutable selected IDs and versions in closure state; schemas do not ask the agent to repeat them.
- Repair preview is non-mutating and limited to one allowlisted operation against the selected condition.
- Apply is absent until the human approves the visible current preview.
- Approval tokens bind patch, workflow, selection, expiry, and single-use state.
- Any relevant edit clears selection, preview, and approval state.
- History stores the before-workflow snapshot for a bounded, versioned undo.

## Untrusted content and redaction

Read tools returning fixtures, traces, simulated messages, or runs set `untrustedContentHint: true`. `readOnlyHint: true` is set only on non-mutating tools.

Before tool data is serialized, FlowLens recursively:

- redacts keys matching secret, token, password, cookie, authorization, or API-key patterns;
- limits object keys and arrays;
- limits recursion depth;
- truncates long strings;
- limits an individual tool output to approximately 1.5 KB.

The seeded VIP note contains instruction-like text and remains data inside the payload.

## Simulator safety

- No `eval`, `Function`, JavaScript node, SQL, template execution, or unrestricted expression engine.
- Field mappings use safe dotted paths only.
- Conditions use a finite operator allowlist.
- Queue assignment, notification, delay, and delivery are trace records only.
- The hero experience performs zero real network calls and zero external side effects.
- Cancellation cannot leave a partial real side effect because none exists.

## WebMCP browser posture

- `document.modelContext` is feature-detected.
- EventTarget-style `toolchange` listeners are separately feature-detected because current compatible surfaces can omit them.
- Registration stays in the top-level same-origin document.
- Tools are not exposed cross-origin.
- Deployment headers set `Permissions-Policy: tools=(self)`.
- Unsupported browsers receive a truthful manual-mode status.

## Polar and admin access

`VITE_POLAR_CHECKOUT_URL` is public configuration. It must be a persistent Checkout Link, never a temporary session URL or organization access token.

The `HectorTa1989` admin persona is a local demonstration convenience requested for this build. It is client-controlled and must not be considered secure authorization. Before production use:

1. Add server-side user authentication.
2. Remove the client-selectable admin persona.
3. Verify Polar webhook signatures on a trusted server.
4. Store customer/subscription state server-side.
5. Return signed or session-bound entitlements to the client.
6. Revoke features for canceled, revoked, or past-due state according to product policy.

Never infer a paid plan only from a checkout success URL parameter.

## Data persistence

Workflow configuration and the local demo persona are stored in localStorage. This build should not be used for production secrets or regulated data. Reset removes the stored FlowLens state and recreates the seed.

## Non-goals

- Authentication and access control.
- Real CRM, email, Slack, queue, webhook, or payment fulfillment.
- Production customer data.
- Cross-origin WebMCP exposure.
- Arbitrary user code.

## Reporting

For security issues, open a private advisory in the GitHub repository owned by `HectorTa1989`. Do not include real secrets or customer payloads in a public issue.
