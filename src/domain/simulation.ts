import { cloneRecord, getPath, setPath } from './path'
import { validateFixture, validateWorkflow } from './validation'
import type { Fixture, Run, RunStep, Workflow, WorkflowNode } from './types'

const durationByType: Record<WorkflowNode['type'], number> = {
  event: 8,
  transform: 16,
  condition: 12,
  assign: 18,
  notification: 24,
  delay: 40,
  end: 6,
}

export function simulateWorkflow(workflow: Workflow, fixture: Fixture, runNumber = 1, signal?: AbortSignal): Run {
  const issues = [...validateWorkflow(workflow), ...validateFixture(fixture, workflow)]
  if (issues.length) throw new Error(`Workflow cannot run: ${issues[0].message}`)

  const started = Date.parse('2026-08-28T10:00:00.000Z') + runNumber * 1000
  const steps: RunStep[] = []
  let payload = cloneRecord(fixture.payload)
  let current = workflow.nodes.find((node) => node.type === 'event')
  let actualOutcome = 'unknown'
  let elapsed = 0

  while (current) {
    if (signal?.aborted) return cancelledRun(workflow, fixture, runNumber, steps, started, elapsed)
    const input = cloneRecord(payload)
    const result = executeNode(current, payload)
    payload = result.output
    elapsed += durationByType[current.type]
    steps.push({
      id: `step-${runNumber}-${current.id}`,
      nodeId: current.id,
      nodeLabel: current.label,
      input,
      output: cloneRecord(payload),
      branch: result.branch,
      status: result.error ? 'failed' : 'success',
      durationMs: durationByType[current.type],
      error: result.error,
      timestamp: new Date(started + elapsed).toISOString(),
    })

    if (current.type === 'end') {
      actualOutcome = (current.config as { outcome: string }).outcome
      break
    }

    const nextEdge = workflow.edges.find((edge) => edge.source === current!.id && (current!.type !== 'condition' || edge.sourcePort === result.branch))
    current = nextEdge ? workflow.nodes.find((node) => node.id === nextEdge.target) : undefined
  }

  const status = actualOutcome === fixture.expectedOutcome ? 'passed' : 'failed'
  return {
    id: `run-${fixture.id}-v${workflow.version}-${runNumber}`,
    workflowVersion: workflow.version,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    expectedOutcome: fixture.expectedOutcome,
    actualOutcome,
    status,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(started + elapsed).toISOString(),
    steps,
  }
}

function executeNode(node: WorkflowNode, source: Record<string, unknown>) {
  const output = cloneRecord(source)
  if (node.type === 'transform') {
    const transformed: Record<string, unknown> = {}
    const mappings = (node.config as { mappings: { from: string; to: string; defaultValue?: string }[] }).mappings
    mappings.forEach((mapping) => setPath(transformed, mapping.to, getPath(source, mapping.from) ?? mapping.defaultValue))
    return { output: transformed }
  }
  if (node.type === 'condition') {
    const config = node.config as { field: string; operator: 'equals' | 'not_equals' | 'exists'; value?: string }
    const value = getPath(source, config.field)
    const matched = config.operator === 'exists' ? value !== undefined : config.operator === 'equals' ? value === config.value : value !== config.value
    return { output, branch: (matched ? 'true' : 'false') as 'true' | 'false', error: value === undefined ? `Field ${config.field} is missing after normalization.` : undefined }
  }
  if (node.type === 'assign') setPath(output, 'assignment.queue', (node.config as { queue: string }).queue)
  if (node.type === 'notification') setPath(output, 'simulation.notification', (node.config as { template: string }).template)
  if (node.type === 'delay') setPath(output, 'simulation.delayMs', (node.config as { milliseconds: number }).milliseconds)
  if (node.type === 'end') setPath(output, 'simulation.outcome', (node.config as { outcome: string }).outcome)
  return { output }
}

function cancelledRun(workflow: Workflow, fixture: Fixture, runNumber: number, steps: RunStep[], started: number, elapsed: number): Run {
  return {
    id: `run-${fixture.id}-v${workflow.version}-${runNumber}`,
    workflowVersion: workflow.version,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    expectedOutcome: fixture.expectedOutcome,
    actualOutcome: 'cancelled',
    status: 'cancelled',
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(started + elapsed).toISOString(),
    steps: steps.map((step) => ({ ...step, status: 'cancelled' })),
  }
}
