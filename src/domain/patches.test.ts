import { describe, expect, it } from 'vitest'
import { freshFixtures, freshWorkflow } from './fixtures'
import { applyApprovedPatch, compareRuns, createApprovalToken, previewConditionFieldPatch } from './patches'
import { simulateWorkflow } from './simulation'
import type { TraceSelection } from './types'

const selection: TraceSelection = {
  runId: 'run-fixture-vip-v7-2',
  stepIds: ['step-2-node-normalize', 'step-2-node-condition'],
  nodeIds: ['node-normalize', 'node-condition'],
  startIndex: 1,
  endIndex: 2,
  selectionVersion: 1,
}

describe('restricted patch lifecycle', () => {
  it('previews a minimal non-mutating patch', () => {
    const workflow = freshWorkflow()
    const patch = previewConditionFieldPatch(workflow, selection, 'customer.segment', 'Use the normalized output field.')
    expect((workflow.nodes.find((node) => node.id === 'node-condition')!.config as { field: string }).field).toBe('customer.tier')
    expect(patch.operations).toHaveLength(1)
    expect(patch.validationResult.valid).toBe(true)
  })

  it('rejects unrelated field paths', () => {
    expect(() => previewConditionFieldPatch(freshWorkflow(), selection, 'constructor', 'Unsafe unrelated patch.')).toThrow('restricted mapping DSL')
  })

  it('requires a current human approval', () => {
    const workflow = freshWorkflow()
    const patch = previewConditionFieldPatch(workflow, selection, 'customer.segment', 'Use the normalized output field.')
    const token = createApprovalToken(patch, 1000)
    expect(() => applyApprovedPatch(workflow, patch, token, selection, 1100)).toThrow('Approval does not match')
  })

  it('applies once and proves the repaired branch', () => {
    const workflow = freshWorkflow()
    const before = simulateWorkflow(workflow, freshFixtures()[1], 2)
    const preview = previewConditionFieldPatch(workflow, selection, 'customer.segment', 'Use the normalized output field.')
    const patch = { ...preview, approvalState: 'approved' as const }
    const token = createApprovalToken(preview, 1000)
    const repaired = applyApprovedPatch(workflow, patch, token, selection, 1100)
    const after = simulateWorkflow(repaired, freshFixtures()[1], 3)
    expect(after.status).toBe('passed')
    expect(after.actualOutcome).toBe('escalated')
    expect(compareRuns(before, after)).toMatchObject({ branchChanged: true, outcomeChanged: true, validationChanged: true })
  })

  it('rejects stale workflow and selection versions', () => {
    const workflow = freshWorkflow()
    const preview = previewConditionFieldPatch(workflow, selection, 'customer.segment', 'Use the normalized output field.')
    const patch = { ...preview, approvalState: 'approved' as const }
    const token = createApprovalToken(preview, 1000)
    expect(() => applyApprovedPatch({ ...workflow, version: 8 }, patch, token, selection, 1100)).toThrow('workflow changed')
    expect(() => applyApprovedPatch(workflow, patch, token, { ...selection, selectionVersion: 2 }, 1100)).toThrow('selection changed')
  })
})
