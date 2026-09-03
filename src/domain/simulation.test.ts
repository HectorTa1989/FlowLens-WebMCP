import { describe, expect, it } from 'vitest'
import { freshFixtures, freshWorkflow } from './fixtures'
import { simulateWorkflow } from './simulation'

describe('deterministic workflow simulator', () => {
  it('keeps the routine fixture on the successful standard branch', () => {
    const run = simulateWorkflow(freshWorkflow(), freshFixtures()[0], 1)
    expect(run.status).toBe('passed')
    expect(run.actualOutcome).toBe('standard')
    expect(run.steps.find((step) => step.nodeId === 'node-condition')?.branch).toBe('false')
  })

  it('captures the subtle VIP mismatch without crashing', () => {
    const run = simulateWorkflow(freshWorkflow(), freshFixtures()[1], 2)
    const condition = run.steps.find((step) => step.nodeId === 'node-condition')
    expect(run.status).toBe('failed')
    expect(run.actualOutcome).toBe('standard')
    expect(condition?.status).toBe('failed')
    expect(condition?.error).toContain('customer.tier')
    expect((run.steps[1].output.customer as Record<string, unknown>).segment).toBe('vip')
  })

  it('produces byte-stable trace evidence for the same inputs', () => {
    const first = simulateWorkflow(freshWorkflow(), freshFixtures()[1], 4)
    const second = simulateWorkflow(freshWorkflow(), freshFixtures()[1], 4)
    expect(second).toEqual(first)
  })

  it('cancels before recording partial simulated effects', () => {
    const controller = new AbortController()
    controller.abort()
    const run = simulateWorkflow(freshWorkflow(), freshFixtures()[1], 3, controller.signal)
    expect(run.status).toBe('cancelled')
    expect(run.steps).toHaveLength(0)
  })
})
