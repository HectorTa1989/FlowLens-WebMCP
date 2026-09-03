import { getPath } from './path'
import type { Fixture, ValidationIssue, Workflow } from './types'

const allowedPorts: Record<string, string[]> = {
  event: ['output'],
  transform: ['output'],
  condition: ['true', 'false'],
  assign: ['output'],
  notification: ['output'],
  delay: ['output'],
  end: [],
}

export function validateWorkflow(workflow: Workflow): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const edgeKeys = new Set<string>()

  workflow.edges.forEach((edge) => {
    if (edge.source === edge.target) issues.push(issue(edge.id, 'SELF_CONNECTION', 'A node cannot connect to itself.', 'Choose a different target.'))
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) issues.push(issue(edge.id, 'UNKNOWN_NODE', 'The edge references a missing node.', 'Reconnect valid nodes.'))
    const source = workflow.nodes.find((node) => node.id === edge.source)
    if (source && !allowedPorts[source.type].includes(edge.sourcePort)) issues.push(issue(edge.id, 'INVALID_PORT', `Port ${edge.sourcePort} is not valid for ${source.type}.`, 'Choose an allowed source port.'))
    const key = `${edge.source}:${edge.sourcePort}:${edge.target}:${edge.targetPort}`
    if (edgeKeys.has(key)) issues.push(issue(edge.id, 'DUPLICATE_EDGE', 'This connection already exists.', 'Remove the duplicate edge.'))
    edgeKeys.add(key)
  })

  if (hasCycle(workflow)) issues.push(issue(workflow.id, 'CYCLE', 'The workflow contains a cycle.', 'Remove the edge that closes the loop.'))

  const trigger = workflow.nodes.find((node) => node.type === 'event')
  if (!trigger) issues.push(issue(workflow.id, 'MISSING_TRIGGER', 'A workflow needs one event trigger.', 'Add an event trigger.'))
  if (trigger) {
    const reachable = getReachable(workflow, trigger.id)
    workflow.nodes.filter((node) => !reachable.has(node.id)).forEach((node) => {
      issues.push(issue(node.id, 'UNREACHABLE_NODE', `${node.label} cannot be reached from the trigger.`, 'Connect or remove this node.'))
    })
  }

  workflow.nodes.forEach((node) => {
    if (node.type === 'condition') {
      const config = node.config as { field: string; operator: string; value?: string }
      if (!config.field || !['equals', 'not_equals', 'exists'].includes(config.operator)) issues.push(issue(node.id, 'INVALID_CONDITION', 'Condition configuration is incomplete.', 'Choose a field and allowed operator.'))
    }
    if (node.type === 'transform') {
      const mappings = (node.config as { mappings: { from: string; to: string }[] }).mappings
      if (!mappings.length || mappings.length > 20) issues.push(issue(node.id, 'INVALID_MAPPING', 'Transform needs between 1 and 20 mappings.', 'Adjust the safe mapping list.'))
    }
  })

  return issues
}

export function validateFixture(fixture: Fixture, workflow: Workflow): ValidationIssue[] {
  const trigger = workflow.nodes.find((node) => node.type === 'event')
  if (!trigger) return []
  return trigger.inputContract.flatMap((field) => {
    const value = getPath(fixture.payload, field.path)
    if (field.required && value === undefined) return [issue(fixture.id, 'MISSING_FIELD', `Fixture is missing ${field.path}.`, 'Add the required field.')]
    return []
  })
}

function issue(entityId: string, code: string, message: string, suggestedAction: string): ValidationIssue {
  return { id: `${entityId}-${code}`, severity: 'error', entityId, code, message, suggestedAction }
}

function getReachable(workflow: Workflow, startId: string) {
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    workflow.edges.filter((edge) => edge.source === current).forEach((edge) => queue.push(edge.target))
  }
  return visited
}

function hasCycle(workflow: Workflow) {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    const cycle = workflow.edges.filter((edge) => edge.source === id).some((edge) => visit(edge.target))
    visiting.delete(id)
    visited.add(id)
    return cycle
  }
  return workflow.nodes.some((node) => visit(node.id))
}
