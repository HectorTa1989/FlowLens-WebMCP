import { describe, expect, it, vi } from 'vitest'
import type { Store } from '../app/store'
import { freshFixtures, freshWorkflow } from '../domain/fixtures'
import { simulateWorkflow } from '../domain/simulation'
import type { AppState } from '../domain/types'
import { createPageTools, createSelectionTools } from './tools'

function fakeStore(): Store {
  const workflow = freshWorkflow()
  const fixtures = freshFixtures()
  const run = simulateWorkflow(workflow, fixtures[1], 2)
  const selection = { runId: run.id, stepIds: run.steps.slice(1, 3).map((step) => step.id), nodeIds: run.steps.slice(1, 3).map((step) => step.nodeId), startIndex: 1, endIndex: 2, selectionVersion: 1 }
  const state = { workflow, fixtures, runs: [run], activeRunId: run.id, selectedFixtureId: fixtures[1].id, selectedNodeId: 'node-condition', selection, selectionSequence: 1, patch: null, approval: null, activities: [], history: [], activePanel: 'trace', account: { handle: 'HectorTa1989', role: 'admin', plan: 'admin' }, paywallFeature: null, toolCounts: { page: 0, selection: 0, approval: 0 }, webmcpSupported: true } as AppState
  return { state, activeRun: run, validationIssues: [], isPro: true, runFixture: vi.fn(), selectFixture: vi.fn(), selectNode: vi.fn(), selectRange: vi.fn(), clearSelection: vi.fn(), setPanel: vi.fn(), previewFix: vi.fn(), approvePatch: vi.fn(), applyPatch: vi.fn(), updateConditionField: vi.fn(), addNode: vi.fn(), connectNodes: vi.fn(), moveNode: vi.fn(), undo: vi.fn(), recordActivity: vi.fn(), setToolCounts: vi.fn(), setWebmcpSupported: vi.fn(), setAccount: vi.fn(), requirePro: vi.fn(() => true), closePaywall: vi.fn(), reset: vi.fn() } as unknown as Store
}

describe('WebMCP tool contracts', () => {
  it('centralizes ten page tools with strict top-level schemas', () => {
    const store = fakeStore()
    const tools = createPageTools(() => store)
    expect(tools).toHaveLength(10)
    expect(tools.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length)
  })

  it('binds selection tools to immutable context without selected IDs in schemas', async () => {
    const store = fakeStore()
    const selection = store.state.selection!
    const tools = createSelectionTools(() => store, selection, store.state.workflow.version)
    expect(tools).toHaveLength(4)
    expect(Object.keys(tools[0].inputSchema.properties)).not.toContain('runId')
    const result = await tools[2].execute({}, { signal: new AbortController().signal })
    expect(result).toContain('customer.segment')
  })
})
