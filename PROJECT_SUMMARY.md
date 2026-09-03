# FlowLens Project Summary

## Elevator pitch
Workflow intelligence, in focus. A selection-aware workflow flight recorder that lets browser agents inspect and repair automation failures through bounded evidence and human approval.

## Inspiration
FlowLens was built for the WebMCP hackathon to solve a core problem in automation debugging: most debuggers require humans to manually translate visual context back into text. We wanted to turn human focus into a typed, temporary tool surface where selecting a failed execution path automatically bounds the evidence an agent can inspect, enabling precise diagnosis and safe repairs without copying node IDs, payloads, or timestamps.

## What it does
FlowLens is a deterministic workflow flight recorder that allows operations specialists to:
- Run automation workflows and visualize execution traces on an interactive canvas
- Select exact failed execution paths (normalization and condition steps)
- Expose selection-bound WebMCP tools that capture immutable run, step, node, selection, and workflow versions
- Let browser agents inspect bounded evidence and propose the smallest safe repair
- Preview patches with visible diffs before any mutation occurs
- Apply approved patches with single-use tokens, rerun fixtures, and prove results with before-and-after comparisons
- Maintain a complete audit trail with undo capability

The hero defect demonstrates a subtle bug: normalization emits `customer.segment` while the condition reads `customer.tier`, causing VIP customers to reach the standard queue without throwing errors.

## How we built it
FlowLens is a static React application built with:
- **React + TypeScript** for type-safe component architecture
- **@xyflow/react** for the interactive workflow canvas with finite node types
- **Vite** for fast development and production builds
- **Zod** for strict JSON Schema validation
- **Lucide React** for consistent iconography
- **@polar-sh/checkout** for embedded Pro feature paywall

The architecture follows a clean domain-driven design:
- Domain layer (`src/domain/`) contains workflow types, validation, simulation, patches, and redaction
- Application layer (`src/app/`) manages state through a typed reducer with command facade
- Feature layer (`src/features/`) provides canvas, header, panel, paywall, and sidebar components
- WebMCP adapter (`src/webmcp/`) handles dynamic tool registration with AbortController cleanup

The deterministic simulator traverses directed graphs producing bounded trace steps without real side effects. The repair engine accepts only restricted operations (like `replace_condition_field`) with preview, approval tokens, version guards, and reversible history.

## Challenges we ran into
- **WebMCP API evolution**: The specification was still evolving, requiring feature detection for both `document.modelContext` and optional `toolchange` events independently
- **Selection lifecycle complexity**: Managing selection-bound tools that need to abort on workflow edits, selection changes, or component unmounts required careful AbortController coordination
- **Security boundaries**: Implementing bounded outputs, secret-like field redaction, version guards, and single-use approval tokens while maintaining usability
- **Deterministic simulation**: Building a simulator that produces realistic traces without actual side effects, queues, or network operations
- **Paywall integration**: Balancing a local admin bypass for demo purposes with production-grade Polar checkout that requires trusted backend authentication

## Accomplishments that we're proud of
- **Complete WebMCP integration**: Successfully implemented 16 tools (10 base, 4 selection-bound, 1 approval, 1 conditional undo) following Chrome security guidance
- **Deterministic testing**: 19/19 Vitest unit tests and 2/2 Playwright E2E tests passing, including real in-app WebMCP calls
- **Apple-inspired UI**: Dark graphite interface with glassy chrome, crisp hierarchy, restrained color, and reduced-motion support
- **Safe mutation model**: Non-mutating preview, visible diffs, human approval, single-use tokens, and reversible history
- **Production-ready build**: TypeScript strict mode passing, static bundle deployable to Vercel or any static host
- **Comprehensive documentation**: Architecture, security model, WebMCP inventory, and eval corpus all documented

## What we learned
- **WebMCP patterns**: The imperative API requires careful lifecycle management—tools must register dynamically, capture closure state, and clean up with AbortController
- **Selection as context**: Turning visual selection into typed API boundaries is more powerful than traditional copy-paste debugging
- **Deterministic simulation**: A bounded simulator can provide sufficient evidence for diagnosis without requiring real integrations
- **Security by design**: Version guards, bounded outputs, and single-use tokens prevent many classes of attacks while maintaining usability
- **Static architecture**: A well-designed static app can deliver complex functionality without backend dependencies

## What's next for FlowLens
- **Additional workflow types**: Expand beyond the CRM escalation hero flow to support more automation patterns
- **Richer patch DSL**: Add more safe operations beyond `replace_condition_field` while maintaining boundedness
- **Authentication backend**: Implement trusted server authentication with Polar webhook verification for production entitlements
- **Multiplayer collaboration**: Enable shared workspaces with real-time collaboration on workflow debugging
- **Advanced analytics**: Add workflow performance insights, failure pattern detection, and optimization suggestions
- **Expanded WebMCP coverage**: Support additional WebMCP features as the specification evolves

## Built with
- React
- TypeScript
- Vite
- @xyflow/react
- Zod
- Lucide React
- @polar-sh/checkout
- Vitest
- Playwright
- WebMCP API
- HTML5
- CSS3
- Node.js
- npm
- GitHub Actions
- Vercel
- JSON Schema
- AbortController
- React Flow
- Deterministic simulation
- Domain-driven design
- Static application architecture
- Browser automation
- Workflow orchestration

---

## YouTube Video Hook

**Title:** I Built an AI That Debugs My Workflows (And It Actually Works)

**Description:**

What if you could just click on a broken workflow and have AI fix it for you? No copying error messages, no digging through logs, no manual debugging.

I built FlowLens—a selection-aware workflow flight recorder that lets browser agents inspect and repair automation failures through bounded evidence and human approval.

The hero bug? A subtle field mismatch where `customer.segment` gets emitted but the condition reads `customer.tier`. VIP customers silently route to the standard queue. No errors thrown. Just wrong results.

With FlowLens, you:
1. Select the failed execution path on the canvas
2. WebMCP tools automatically register with immutable context
3. Ask the AI: "Why did this selected path fail? Fix it with the smallest safe change"
4. Preview the exact patch with visible diffs
5. Approve with one click—it applies, reruns, and proves the fix

This is the future of debugging: visual selection becomes typed API boundaries. AI sees only what you show it. You approve every change. Complete audit trail with undo.

Built for the WebMCP hackathon using React, TypeScript, and the Chrome WebMCP API. No backend required. Deterministic simulation. Safe mutation model.

Watch me debug a real automation failure in 30 seconds using AI-assisted workflow repair.

#WebMCP #AI #Automation #React #TypeScript #DevTools
