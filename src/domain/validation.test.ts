import { describe, expect, it } from 'vitest'
import { freshWorkflow } from './fixtures'
import { validateWorkflow } from './validation'

describe('workflow validation', () => {
  it('accepts the seeded workflow', () => expect(validateWorkflow(freshWorkflow())).toEqual([]))

  it.each([
    ['self connection', { id: 'bad', source: 'node-trigger', sourcePort: 'output', target: 'node-trigger', targetPort: 'input' }, 'SELF_CONNECTION'],
    ['duplicate edge', { id: 'bad', source: 'node-trigger', sourcePort: 'output', target: 'node-normalize', targetPort: 'input' }, 'DUPLICATE_EDGE'],
    ['invalid port', { id: 'bad', source: 'node-trigger', sourcePort: 'true', target: 'node-normalize', targetPort: 'input' }, 'INVALID_PORT'],
  ])('rejects a %s', (_, edge, code) => {
    const workflow = freshWorkflow()
    workflow.edges.push(edge)
    expect(validateWorkflow(workflow).some((issue) => issue.code === code)).toBe(true)
  })

  it('rejects a cycle', () => {
    const workflow = freshWorkflow()
    workflow.edges.push({ id: 'cycle', source: 'node-end-standard', sourcePort: 'output', target: 'node-trigger', targetPort: 'input' })
    expect(validateWorkflow(workflow).some((issue) => issue.code === 'CYCLE')).toBe(true)
  })

  it('reports unreachable nodes', () => {
    const workflow = freshWorkflow()
    workflow.edges = workflow.edges.filter((edge) => edge.target !== 'node-standard')
    expect(validateWorkflow(workflow).some((issue) => issue.entityId === 'node-standard' && issue.code === 'UNREACHABLE_NODE')).toBe(true)
  })
})
