import type { Store } from '../app/store'
import { compareRuns } from '../domain/patches'
import { compact, redact } from '../domain/redaction'
import type { NodeConfig, NodeType, Run, TraceSelection } from '../domain/types'
import { approvalToolCatalog, pageToolCatalog, selectionToolCatalog, undoToolCatalog } from './catalog'
import type { JsonSchema, WebMCPTool } from './types'

const emptySchema: JsonSchema = { type: 'object', properties: {}, additionalProperties: false }
const version = { type: 'integer', minimum: 1, maximum: 100000, description: 'Workflow version visible in the app.' }
const shortString = { type: 'string', minLength: 1, maxLength: 120 }
const strictNodeConfig = {
  oneOf: [
    { type: 'object', properties: { eventType: shortString }, required: ['eventType'], additionalProperties: false },
    { type: 'object', properties: { mappings: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', properties: { from: shortString, to: shortString, defaultValue: shortString }, required: ['from', 'to'], additionalProperties: false } } }, required: ['mappings'], additionalProperties: false },
    { type: 'object', properties: { field: shortString, operator: { type: 'string', enum: ['equals', 'not_equals', 'exists'] }, value: shortString }, required: ['field', 'operator'], additionalProperties: false },
    { type: 'object', properties: { queue: shortString }, required: ['queue'], additionalProperties: false },
    { type: 'object', properties: { channel: { type: 'string', enum: ['in_app', 'email'] }, template: shortString }, required: ['channel', 'template'], additionalProperties: false },
    { type: 'object', properties: { milliseconds: { type: 'integer', minimum: 0, maximum: 60000 } }, required: ['milliseconds'], additionalProperties: false },
    { type: 'object', properties: { outcome: shortString }, required: ['outcome'], additionalProperties: false },
  ],
}

export function createPageTools(getStore: () => Store): WebMCPTool[] {
  return [
    tool(pageToolCatalog[0], {
      type: 'object',
      properties: { detail: { type: 'string', enum: ['compact', 'nodes', 'runs'] } },
      additionalProperties: false,
    }, { readOnlyHint: true }, (input) => {
      rejectUnknown(input, ['detail'])
      const { state, validationIssues } = getStore()
      return json({
        workflow: { id: state.workflow.id, name: state.workflow.name, version: state.workflow.version, nodes: state.workflow.nodes.map((node) => ({ id: node.id, type: node.type, label: node.label })), edges: state.workflow.edges.length },
        validation: { valid: validationIssues.length === 0, issueCount: validationIssues.length },
        selection: state.selection ? { runId: state.selection.runId, nodeIds: state.selection.nodeIds, stepCount: state.selection.stepIds.length, selectionVersion: state.selection.selectionVersion } : null,
        latestRunIds: state.runs.slice(-5).map((run) => run.id),
      })
    }),
    tool(pageToolCatalog[1], {
      type: 'object',
      properties: { category: { type: 'string', enum: ['all', 'logic', 'actions', 'flow'] } },
      additionalProperties: false,
    }, { readOnlyHint: true }, (input) => {
      rejectUnknown(input, ['category'])
      return json({ nodeTypes: [
        { type: 'event', contract: 'eventType' }, { type: 'transform', contract: 'safe field mappings' }, { type: 'condition', contract: 'field + allowlisted operator + value' },
        { type: 'assign', contract: 'simulated queue' }, { type: 'notification', contract: 'simulated template' }, { type: 'delay', contract: 'bounded milliseconds' }, { type: 'end', contract: 'outcome' },
      ] })
    }),
    tool(pageToolCatalog[2], {
      type: 'object',
      properties: {
        nodeType: { type: 'string', enum: ['event', 'transform', 'condition', 'assign', 'notification', 'delay', 'end'] },
        x: { type: 'number', minimum: 0, maximum: 1400 },
        y: { type: 'number', minimum: 0, maximum: 600 },
        expectedVersion: version,
        config: strictNodeConfig,
      },
      required: ['nodeType', 'x', 'y', 'expectedVersion'],
      additionalProperties: false,
    }, undefined, (input) => {
      rejectUnknown(input, ['nodeType', 'x', 'y', 'expectedVersion', 'config'])
      const nodeType = requiredEnum(input, 'nodeType', ['event', 'transform', 'condition', 'assign', 'notification', 'delay', 'end']) as NodeType
      const config = parseNodeConfig(nodeType, input.config)
      const node = getStore().addNode(nodeType, { x: requiredNumber(input, 'x'), y: requiredNumber(input, 'y') }, requiredNumber(input, 'expectedVersion'), 'webmcp', config)
      return json({ added: { id: node.id, type: node.type, label: node.label }, selected: true, nextWorkflowVersion: getStore().state.workflow.version + 1 })
    }),
    tool(pageToolCatalog[3], {
      type: 'object',
      properties: { nodeId: shortString, field: { type: 'string', enum: ['condition.field'] }, value: shortString, expectedVersion: version },
      required: ['nodeId', 'field', 'value', 'expectedVersion'],
      additionalProperties: false,
    }, undefined, (input) => {
      rejectUnknown(input, ['nodeId', 'field', 'value', 'expectedVersion'])
      if (requiredString(input, 'nodeId') !== 'node-condition' || input.field !== 'condition.field') throw new Error('Only condition.field is editable in the polished hero workflow.')
      getStore().updateConditionField(requiredString(input, 'value'), requiredNumber(input, 'expectedVersion'), 'webmcp')
      return json({ updated: 'node-condition', field: 'condition.field', nextWorkflowVersion: getStore().state.workflow.version + 1 })
    }),
    tool(pageToolCatalog[4], {
      type: 'object',
      properties: { source: shortString, sourcePort: { type: 'string', enum: ['output', 'true', 'false'] }, target: shortString, targetPort: { type: 'string', enum: ['input'] }, expectedVersion: version },
      required: ['source', 'sourcePort', 'target', 'targetPort', 'expectedVersion'],
      additionalProperties: false,
    }, undefined, (input) => {
      rejectUnknown(input, ['source', 'sourcePort', 'target', 'targetPort', 'expectedVersion'])
      getStore().connectNodes(requiredString(input, 'source'), requiredString(input, 'sourcePort'), requiredString(input, 'target'), requiredString(input, 'targetPort'), requiredNumber(input, 'expectedVersion'), 'webmcp')
      return json({ connected: true, nextWorkflowVersion: getStore().state.workflow.version + 1 })
    }),
    tool(pageToolCatalog[5], {
      type: 'object', properties: { workflowVersion: version }, additionalProperties: false,
    }, { readOnlyHint: true }, (input) => {
      rejectUnknown(input, ['workflowVersion'])
      const { state, validationIssues } = getStore()
      if (input.workflowVersion !== undefined && input.workflowVersion !== state.workflow.version) throw new Error(`Stale workflow version. Expected ${state.workflow.version}.`)
      return json({ workflowVersion: state.workflow.version, valid: validationIssues.length === 0, issues: validationIssues.slice(0, 20) })
    }),
    tool(pageToolCatalog[6], emptySchema, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, [])
      return json({ fixtures: getStore().state.fixtures.map((fixture) => ({ id: fixture.id, name: fixture.name, eventType: fixture.eventType, expectedOutcome: fixture.expectedOutcome, badge: fixture.badge })) })
    }),
    tool(pageToolCatalog[7], {
      type: 'object', properties: { fixtureId: shortString, expectedVersion: version }, required: ['fixtureId', 'expectedVersion'], additionalProperties: false,
    }, undefined, (input, options) => {
      rejectUnknown(input, ['fixtureId', 'expectedVersion'])
      const store = getStore()
      if (requiredNumber(input, 'expectedVersion') !== store.state.workflow.version) throw new Error(`Stale workflow version. Expected ${store.state.workflow.version}.`)
      const run = store.runFixture(requiredString(input, 'fixtureId'), 'webmcp', options.signal)
      return json(runSummary(run))
    }),
    tool(pageToolCatalog[8], {
      type: 'object', properties: { runId: shortString }, required: ['runId'], additionalProperties: false,
    }, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, ['runId'])
      const run = findRun(getStore(), requiredString(input, 'runId'))
      return json(runSummary(run))
    }),
    tool(pageToolCatalog[9], {
      type: 'object', properties: { beforeRunId: shortString, afterRunId: shortString }, required: ['beforeRunId', 'afterRunId'], additionalProperties: false,
    }, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, ['beforeRunId', 'afterRunId'])
      const store = getStore()
      return json(compareRuns(findRun(store, requiredString(input, 'beforeRunId')), findRun(store, requiredString(input, 'afterRunId'))))
    }),
  ]
}

export function createUndoTool(getStore: () => Store): WebMCPTool {
  return tool(undoToolCatalog[0], {
    type: 'object', properties: { expectedVersion: version }, required: ['expectedVersion'], additionalProperties: false,
  }, undefined, (input) => {
    rejectUnknown(input, ['expectedVersion'])
    getStore().undo(requiredNumber(input, 'expectedVersion'), 'webmcp')
    return json({ undone: true, workflowVersion: getStore().state.workflow.version + 1 })
  })
}

export function createSelectionTools(getStore: () => Store, captured: TraceSelection, capturedWorkflowVersion: number): WebMCPTool[] {
  const current = () => {
    const store = getStore()
    if (store.state.workflow.version !== capturedWorkflowVersion) throw new Error('Selection is stale because the workflow changed. Select the trace again.')
    if (store.state.selection?.selectionVersion !== captured.selectionVersion) throw new Error('Selection changed. Use the newly registered selection tools.')
    return store
  }
  return [
    tool(selectionToolCatalog[0], {
      type: 'object', properties: { detail: { type: 'string', enum: ['compact', 'values', 'contracts'] } }, additionalProperties: false,
    }, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, ['detail'])
      const store = current()
      const run = findRun(store, captured.runId)
      const steps = run.steps.filter((step) => captured.stepIds.includes(step.id)).map((step) => ({ id: step.id, nodeId: step.nodeId, label: step.nodeLabel, status: step.status, branch: step.branch, input: redact(step.input), output: redact(step.output), error: step.error }))
      store.setPanel('trace')
      return json({ runId: run.id, workflowVersion: capturedWorkflowVersion, selectionVersion: captured.selectionVersion, steps })
    }),
    tool(selectionToolCatalog[1], {
      type: 'object', properties: { baselineRunId: shortString }, additionalProperties: false,
    }, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, ['baselineRunId'])
      const store = current()
      const selectedRun = findRun(store, captured.runId)
      const baseline = input.baselineRunId ? findRun(store, requiredString(input, 'baselineRunId')) : [...store.state.runs].reverse().find((run) => run.fixtureId === 'fixture-standard')
      if (!baseline) throw new Error('No compatible baseline run exists.')
      return json({ selected: runSummary(selectedRun), baseline: runSummary(baseline), comparison: compareRuns(baseline, selectedRun) })
    }),
    tool(selectionToolCatalog[2], emptySchema, { readOnlyHint: true, untrustedContentHint: true }, (input) => {
      rejectUnknown(input, [])
      const store = current()
      const run = findRun(store, captured.runId)
      const normalize = run.steps.find((step) => step.nodeId === 'node-normalize')
      const condition = run.steps.find((step) => step.nodeId === 'node-condition')
      if (!captured.nodeIds.includes('node-condition') || !condition) throw new Error('Select the condition failure to inspect its contract mismatch.')
      store.setPanel('trace')
      return json({ mismatch: { expectedField: 'customer.tier', availableField: 'customer.segment', expectedType: 'string', actualType: typeof (normalize?.output.customer as Record<string, unknown> | undefined)?.segment, evidence: condition.error }, smallestSafeChange: { nodeId: 'node-condition', field: 'condition.field', from: 'customer.tier', to: 'customer.segment' } })
    }),
    tool(selectionToolCatalog[3], {
      type: 'object',
      properties: {
        expectedWorkflowVersion: version,
        expectedSelectionVersion: { type: 'integer', minimum: 1, maximum: 100000 },
        operations: { type: 'array', minItems: 1, maxItems: 1, items: { type: 'object', properties: { op: { const: 'replace_condition_field' }, after: shortString }, required: ['op', 'after'], additionalProperties: false } },
        rationale: { type: 'string', minLength: 10, maxLength: 280 },
      },
      required: ['expectedWorkflowVersion', 'expectedSelectionVersion', 'operations', 'rationale'],
      additionalProperties: false,
    }, undefined, (input) => {
      rejectUnknown(input, ['expectedWorkflowVersion', 'expectedSelectionVersion', 'operations', 'rationale'])
      const store = current()
      if (requiredNumber(input, 'expectedWorkflowVersion') !== capturedWorkflowVersion || requiredNumber(input, 'expectedSelectionVersion') !== captured.selectionVersion) throw new Error('Version guard failed. Read the current selection again.')
      const operations = input.operations
      if (!Array.isArray(operations) || operations.length !== 1 || operations[0]?.op !== 'replace_condition_field' || typeof operations[0]?.after !== 'string') throw new Error('Only one replace_condition_field operation is allowed.')
      const patch = store.previewFix(operations[0].after, requiredString(input, 'rationale'), 'webmcp')
      return json({ patchId: patch.id, diff: patch.operations[0], validation: patch.validationResult, mutated: false, next: 'Human must review and approve in the visible patch panel.' })
    }),
  ]
}

export function createApprovalTool(getStore: () => Store, capturedToken: string): WebMCPTool {
  return tool(approvalToolCatalog[0], {
    type: 'object', properties: { approvalToken: { type: 'string', minLength: 20, maxLength: 240 } }, required: ['approvalToken'], additionalProperties: false,
  }, undefined, (input) => {
    rejectUnknown(input, ['approvalToken'])
    const token = requiredString(input, 'approvalToken')
    if (token !== capturedToken) throw new Error('The approval token is invalid or stale.')
    const run = getStore().applyPatch(token, 'webmcp')
    return json({ applied: true, run: runSummary(run), approvalConsumed: true })
  })
}

function tool(catalog: readonly [string, string, string], inputSchema: JsonSchema, annotations: WebMCPTool['annotations'], execute: WebMCPTool['execute']): WebMCPTool {
  return { name: catalog[0], title: catalog[1], description: catalog[2], inputSchema, annotations, execute }
}

function rejectUnknown(input: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(input).find((key) => !allowed.includes(key))
  if (unknown) throw new Error(`Unexpected input property: ${unknown}`)
}

function requiredString(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (typeof value !== 'string' || value.length < 1 || value.length > 280) throw new Error(`${key} must be a bounded string.`)
  return value
}

function requiredNumber(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a number.`)
  return value
}

function requiredEnum(input: Record<string, unknown>, key: string, values: string[]) {
  const value = requiredString(input, key)
  if (!values.includes(value)) throw new Error(`${key} is not allowed.`)
  return value
}

function parseNodeConfig(type: NodeType, input: unknown): NodeConfig | undefined {
  if (input === undefined) return undefined
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('config must be a bounded object.')
  const config = input as Record<string, unknown>
  const allowed: Record<NodeType, string[]> = { event: ['eventType'], transform: ['mappings'], condition: ['field', 'operator', 'value'], assign: ['queue'], notification: ['channel', 'template'], delay: ['milliseconds'], end: ['outcome'] }
  rejectUnknown(config, allowed[type])
  if (type === 'event') return { eventType: requiredString(config, 'eventType') }
  if (type === 'assign') return { queue: requiredString(config, 'queue') }
  if (type === 'end') return { outcome: requiredString(config, 'outcome') }
  if (type === 'delay') return { milliseconds: Math.max(0, Math.min(60000, requiredNumber(config, 'milliseconds'))) }
  if (type === 'condition') return { field: requiredString(config, 'field'), operator: requiredEnum(config, 'operator', ['equals', 'not_equals', 'exists']) as 'equals' | 'not_equals' | 'exists', value: typeof config.value === 'string' ? config.value.slice(0, 120) : undefined }
  if (type === 'notification') return { channel: requiredEnum(config, 'channel', ['in_app', 'email']) as 'in_app' | 'email', template: requiredString(config, 'template') }
  if (!Array.isArray(config.mappings) || config.mappings.length < 1 || config.mappings.length > 20) throw new Error('mappings must contain 1–20 safe field mappings.')
  return { mappings: config.mappings.map((mapping) => {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('Each mapping must be an object.')
    const item = mapping as Record<string, unknown>
    rejectUnknown(item, ['from', 'to', 'defaultValue'])
    return { from: requiredString(item, 'from'), to: requiredString(item, 'to'), defaultValue: typeof item.defaultValue === 'string' ? item.defaultValue.slice(0, 120) : undefined }
  }) }
}

function findRun(store: Store, runId: string) {
  const run = store.state.runs.find((item) => item.id === runId)
  if (!run) throw new Error('Run not found or outside the retained history window.')
  return run
}

function runSummary(run: Run) {
  return { id: run.id, fixtureId: run.fixtureId, workflowVersion: run.workflowVersion, status: run.status, expectedOutcome: run.expectedOutcome, actualOutcome: run.actualOutcome, branchPath: run.steps.filter((step) => step.branch).map((step) => `${step.nodeId}:${step.branch}`), failures: run.steps.filter((step) => step.error).map((step) => ({ stepId: step.id, nodeId: step.nodeId, error: step.error })), stepIds: run.steps.map((step) => step.id), durationMs: run.steps.reduce((total, step) => total + step.durationMs, 0) }
}

function json(value: unknown) {
  const output = JSON.stringify(redact(value))
  return output.length > 1500 ? JSON.stringify({ bounded: true, summary: output.slice(0, 1350) }) : output
}

export function summarizeToolError(error: unknown) {
  return error instanceof Error ? error.message : compact(error)
}
