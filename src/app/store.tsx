import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { freshFixtures, freshWorkflow } from '../domain/fixtures'
import { applyApprovedPatch, createApprovalToken, previewConditionFieldPatch } from '../domain/patches'
import { compact } from '../domain/redaction'
import { simulateWorkflow } from '../domain/simulation'
import { validateWorkflow } from '../domain/validation'
import type { ActivityEvent, AppState, NodeConfig, NodeType, Patch, Run, TraceSelection, Workflow, WorkflowNode } from '../domain/types'

type Source = 'human' | 'webmcp' | 'system'

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'run'; run: Run; activity: ActivityEvent }
  | { type: 'select_fixture'; fixtureId: string }
  | { type: 'select_node'; nodeId: string | null; selection: TraceSelection | null; sequence: number; activity?: ActivityEvent }
  | { type: 'select_range'; selection: TraceSelection; sequence: number; activity: ActivityEvent }
  | { type: 'clear_selection'; sequence: number; activity: ActivityEvent }
  | { type: 'set_panel'; panel: AppState['activePanel'] }
  | { type: 'preview_patch'; patch: Patch; activity: ActivityEvent }
  | { type: 'approve_patch'; patch: Patch; approval: NonNullable<AppState['approval']>; activity: ActivityEvent }
  | { type: 'apply_patch'; workflow: Workflow; patch: Patch; run: Run; history: AppState['history'][number]; activity: ActivityEvent }
  | { type: 'update_workflow'; workflow: Workflow; history: AppState['history'][number]; activity: ActivityEvent }
  | { type: 'undo'; workflow: Workflow; run: Run; activity: ActivityEvent }
  | { type: 'activity'; activity: ActivityEvent }
  | { type: 'tool_counts'; counts: AppState['toolCounts'] }
  | { type: 'webmcp_support'; supported: boolean }
  | { type: 'account'; account: AppState['account'] }
  | { type: 'paywall'; feature: string | null }
  | { type: 'reset'; state: AppState }

export type Store = {
  state: AppState
  activeRun: Run | null
  validationIssues: ReturnType<typeof validateWorkflow>
  isPro: boolean
  runFixture: (fixtureId?: string, source?: Source, signal?: AbortSignal) => Run
  selectFixture: (fixtureId: string) => void
  selectNode: (nodeId: string | null, source?: Source) => void
  selectRange: (start: number, end: number, source?: Source) => void
  clearSelection: (source?: Source) => void
  setPanel: (panel: AppState['activePanel']) => void
  previewFix: (after?: string, rationale?: string, source?: Source) => Patch
  approvePatch: () => string
  applyPatch: (token: string, source?: Source) => Run
  updateConditionField: (field: string, expectedVersion: number, source?: Source) => void
  addNode: (nodeType: NodeType, position: { x: number; y: number }, expectedVersion: number, source?: Source, config?: NodeConfig) => WorkflowNode
  connectNodes: (sourceId: string, sourcePort: string, targetId: string, targetPort: string, expectedVersion: number, source?: Source) => void
  moveNode: (nodeId: string, position: { x: number; y: number }, source?: Source) => void
  undo: (expectedVersion?: number, source?: Source) => void
  recordActivity: (toolName: string, status: ActivityEvent['status'], result: string, source?: Source, entities?: string[], input?: unknown, diff?: string) => void
  setToolCounts: (counts: AppState['toolCounts']) => void
  setWebmcpSupported: (supported: boolean) => void
  setAccount: (role: 'admin' | 'viewer') => void
  requirePro: (feature: string) => boolean
  closePaywall: () => void
  reset: () => void
}

const StoreContext = createContext<Store | null>(null)
const persistenceKey = 'flowlens-state-v1'

function initialState(): AppState {
  const workflow = freshWorkflow()
  const fixtures = freshFixtures()
  const baseline = simulateWorkflow(workflow, fixtures[0], 1)
  const vip = simulateWorkflow(workflow, fixtures[1], 2)
  return {
    workflow,
    fixtures,
    runs: [baseline, vip],
    activeRunId: vip.id,
    selectedFixtureId: fixtures[1].id,
    selectedNodeId: null,
    selection: null,
    selectionSequence: 0,
    patch: null,
    approval: null,
    activities: [
      activity('system', 'hero_fixture_ready', 'success', 'Deterministic VIP failure captured.', [vip.id]),
      activity('system', 'baseline_ready', 'success', 'Successful comparison baseline captured.', [baseline.id]),
    ],
    history: [],
    activePanel: 'trace',
    account: { handle: 'HectorTa1989', role: 'admin', plan: 'admin' },
    paywallFeature: null,
    toolCounts: { page: 0, selection: 0, approval: 0 },
    webmcpSupported: false,
  }
}

function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'hydrate' || action.type === 'reset') return action.state
  if (action.type === 'run') return bounded({ ...state, runs: [...state.runs, action.run], activeRunId: action.run.id, activePanel: 'trace', activities: [...state.activities, action.activity] })
  if (action.type === 'select_fixture') return { ...state, selectedFixtureId: action.fixtureId }
  if (action.type === 'select_node') return bounded({ ...state, selectedNodeId: action.nodeId, selection: action.selection, selectionSequence: action.sequence, patch: null, approval: null, activePanel: action.selection ? 'trace' : 'inspect', activities: action.activity ? [...state.activities, action.activity] : state.activities })
  if (action.type === 'select_range') return bounded({ ...state, selection: action.selection, selectedNodeId: action.selection.nodeIds.at(-1) ?? null, selectionSequence: action.sequence, patch: null, approval: null, activePanel: 'trace', activities: [...state.activities, action.activity] })
  if (action.type === 'clear_selection') return bounded({ ...state, selection: null, selectedNodeId: null, selectionSequence: action.sequence, patch: null, approval: null, activities: [...state.activities, action.activity] })
  if (action.type === 'set_panel') return { ...state, activePanel: action.panel }
  if (action.type === 'preview_patch') return bounded({ ...state, patch: action.patch, approval: null, activePanel: 'patch', activities: [...state.activities, action.activity] })
  if (action.type === 'approve_patch') return bounded({ ...state, patch: action.patch, approval: action.approval, activities: [...state.activities, action.activity] })
  if (action.type === 'apply_patch') return bounded({ ...state, workflow: action.workflow, patch: action.patch, approval: state.approval ? { ...state.approval, used: true } : null, runs: [...state.runs, action.run], activeRunId: action.run.id, selection: null, selectedNodeId: null, selectionSequence: state.selectionSequence + 1, history: [...state.history, action.history], activePanel: 'compare', activities: [...state.activities, action.activity] })
  if (action.type === 'update_workflow') return bounded({ ...state, workflow: action.workflow, history: [...state.history, action.history], selection: null, selectedNodeId: null, patch: null, approval: null, selectionSequence: state.selectionSequence + 1, activities: [...state.activities, action.activity] })
  if (action.type === 'undo') return bounded({ ...state, workflow: action.workflow, runs: [...state.runs, action.run], activeRunId: action.run.id, history: state.history.slice(0, -1), selection: null, selectedNodeId: null, patch: null, approval: null, activePanel: 'trace', selectionSequence: state.selectionSequence + 1, activities: [...state.activities, action.activity] })
  if (action.type === 'activity') return bounded({ ...state, activities: [...state.activities, action.activity] })
  if (action.type === 'tool_counts') return { ...state, toolCounts: action.counts }
  if (action.type === 'webmcp_support') return { ...state, webmcpSupported: action.supported }
  if (action.type === 'account') return { ...state, account: action.account, paywallFeature: null }
  if (action.type === 'paywall') return { ...state, paywallFeature: action.feature }
  return state
}

function bounded(state: AppState): AppState {
  return { ...state, activities: state.activities.slice(-100), runs: state.runs.slice(-30), history: state.history.slice(-20) }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const activeRun = state.runs.find((run) => run.id === state.activeRunId) ?? null
  const isPro = state.account.role === 'admin'

  useEffect(() => {
    const saved = localStorage.getItem(persistenceKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Pick<AppState, 'workflow' | 'account'>
      if (!parsed.workflow?.nodes?.length) return
      const base = initialState()
      const fixtures = freshFixtures()
      const valid = validateWorkflow(parsed.workflow).length === 0
      const baseline = valid ? simulateWorkflow(parsed.workflow, fixtures[0], 1) : null
      const vip = valid ? simulateWorkflow(parsed.workflow, fixtures[1], 2) : null
      dispatch({ type: 'hydrate', state: { ...base, workflow: parsed.workflow, account: parsed.account ?? base.account, fixtures, runs: baseline && vip ? [baseline, vip] : [], activeRunId: vip?.id ?? null } })
    } catch {
      localStorage.removeItem(persistenceKey)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(persistenceKey, JSON.stringify({ workflow: state.workflow, account: state.account }))
  }, [state.workflow, state.account])

  const runFixture = useCallback((fixtureId = state.selectedFixtureId, source: Source = 'human', signal?: AbortSignal) => {
    const fixture = state.fixtures.find((item) => item.id === fixtureId)
    if (!fixture) throw new Error('Fixture not found.')
    if (state.runs.length >= 30) throw new Error('The 30-run safety limit was reached. Reset the workspace to continue.')
    const run = simulateWorkflow(state.workflow, fixture, state.runs.length + 1, signal)
    dispatch({ type: 'run', run, activity: activity(source, 'run_workflow_simulation', run.status === 'cancelled' ? 'cancelled' : 'success', `${fixture.name}: ${run.actualOutcome} (${run.status}).`, [run.id], { fixtureId, expectedVersion: state.workflow.version }) })
    return run
  }, [state.fixtures, state.runs.length, state.selectedFixtureId, state.workflow])

  const selectFixture = useCallback((fixtureId: string) => dispatch({ type: 'select_fixture', fixtureId }), [])

  const selectRange = useCallback((start: number, end: number, source: Source = 'human') => {
    if (!activeRun) throw new Error('Run a fixture before selecting trace evidence.')
    const from = Math.max(0, Math.min(start, end))
    const to = Math.min(activeRun.steps.length - 1, Math.max(start, end))
    if (to - from + 1 > 12) throw new Error('Trace selections are limited to 12 contiguous steps.')
    const steps = activeRun.steps.slice(from, to + 1)
    const selection: TraceSelection = { runId: activeRun.id, stepIds: steps.map((step) => step.id), nodeIds: steps.map((step) => step.nodeId), startIndex: from, endIndex: to, selectionVersion: state.selectionSequence + 1 }
    dispatch({ type: 'select_range', selection, sequence: selection.selectionVersion, activity: activity(source, 'selection_context_changed', 'success', `${steps.length} trace step${steps.length === 1 ? '' : 's'} bound to agent context.`, selection.nodeIds) })
  }, [activeRun, state.selectionSequence])

  const selectNode = useCallback((nodeId: string | null, source: Source = 'human') => {
    if (!nodeId) {
      dispatch({ type: 'select_node', nodeId: null, selection: null, sequence: state.selectionSequence + 1 })
      return
    }
    const index = activeRun?.steps.findIndex((step) => step.nodeId === nodeId) ?? -1
    if (index >= 0) {
      selectRange(index, index, source)
      return
    }
    dispatch({ type: 'select_node', nodeId, selection: null, sequence: state.selectionSequence + 1 })
  }, [activeRun, selectRange, state.selectionSequence])

  const clearSelection = useCallback((source: Source = 'human') => dispatch({ type: 'clear_selection', sequence: state.selectionSequence + 1, activity: activity(source, 'selection_context_cleared', 'success', 'Selection-bound tools removed.', []) }), [state.selectionSequence])
  const setPanel = useCallback((panel: AppState['activePanel']) => dispatch({ type: 'set_panel', panel }), [])

  const requirePro = useCallback((feature: string) => {
    if (isPro) return true
    dispatch({ type: 'paywall', feature })
    return false
  }, [isPro])

  const previewFix = useCallback((after = 'customer.segment', rationale = 'Align the condition with the normalized output contract.', source: Source = 'human') => {
    if (!requirePro('AI-assisted repair previews')) throw new Error('A Pro plan is required for repair previews.')
    if (!state.selection) throw new Error('Select the normalization and condition trace steps first.')
    const patch = previewConditionFieldPatch(state.workflow, state.selection, after, rationale)
    dispatch({ type: 'preview_patch', patch, activity: activity(source, 'preview_fix_for_selected_failure', 'success', 'Minimal one-field patch staged without mutation.', patch.operations.map((operation) => operation.nodeId), { after, expectedVersion: state.workflow.version }, `${patch.operations[0].before} → ${patch.operations[0].after}`) })
    return patch
  }, [requirePro, state.selection, state.workflow])

  const approvePatch = useCallback(() => {
    if (!state.patch) throw new Error('Preview a patch before approval.')
    const approval = createApprovalToken(state.patch)
    const patch = { ...state.patch, approvalState: 'approved' as const }
    dispatch({ type: 'approve_patch', patch, approval, activity: activity('human', 'approve_patch', 'success', 'Single-use approval created for five minutes.', [patch.id]) })
    return approval.value
  }, [state.patch])

  const applyPatch = useCallback((token: string, source: Source = 'webmcp') => {
    if (!requirePro('Approved patch application')) throw new Error('A Pro plan is required to apply patches.')
    if (!state.patch || !state.approval || !state.selection) throw new Error('A current approved patch and selection are required.')
    if (token !== state.approval.value) throw new Error('Approval token is invalid.')
    const workflow = applyApprovedPatch(state.workflow, state.patch, state.approval, state.selection)
    const fixture = state.fixtures.find((item) => item.id === state.runs.find((run) => run.id === state.selection!.runId)?.fixtureId) ?? state.fixtures[1]
    const run = simulateWorkflow(workflow, fixture, state.runs.length + 1)
    const patch = { ...state.patch, approvalState: 'applied' as const }
    const history = { id: `history-${workflow.version}`, command: 'apply_approved_workflow_patch', beforeVersion: state.workflow.version, afterVersion: workflow.version, reversible: true, timestamp: new Date().toISOString(), beforeWorkflow: state.workflow }
    dispatch({ type: 'apply_patch', workflow, patch, run, history, activity: activity(source, 'apply_approved_workflow_patch', 'success', `Patch applied. Rerun reached ${run.actualOutcome}.`, [patch.id, run.id], { approvalToken: '[single-use]' }, `v${state.workflow.version} → v${workflow.version}`) })
    return run
  }, [requirePro, state.approval, state.fixtures, state.patch, state.runs, state.selection, state.workflow])

  const updateConditionField = useCallback((field: string, expectedVersion: number, source: Source = 'human') => {
    if (expectedVersion !== state.workflow.version) throw new Error(`Stale workflow version. Expected ${state.workflow.version}.`)
    const workflow: Workflow = { ...state.workflow, version: state.workflow.version + 1, updatedAt: new Date().toISOString(), nodes: state.workflow.nodes.map((node) => node.id === 'node-condition' ? { ...node, config: { ...node.config, field } } : node) }
    const issues = validateWorkflow(workflow)
    if (issues.length) throw new Error(issues[0].message)
    const history = { id: `history-${workflow.version}`, command: 'update_workflow_node', beforeVersion: state.workflow.version, afterVersion: workflow.version, reversible: true, timestamp: new Date().toISOString(), beforeWorkflow: state.workflow }
    dispatch({ type: 'update_workflow', workflow, history, activity: activity(source, 'update_workflow_node', 'success', `Condition field changed to ${field}.`, ['node-condition'], { expectedVersion }, `${(state.workflow.nodes.find((node) => node.id === 'node-condition')!.config as { field: string }).field} → ${field}`) })
  }, [state.workflow])

  const addNode = useCallback((nodeType: NodeType, position: { x: number; y: number }, expectedVersion: number, source: Source = 'webmcp', config?: NodeConfig) => {
    if (expectedVersion !== state.workflow.version) throw new Error(`Stale workflow version. Expected ${state.workflow.version}.`)
    if (state.workflow.nodes.length >= 20) throw new Error('The 20-node workflow limit was reached.')
    const index = state.workflow.nodes.filter((node) => node.type === nodeType).length + 1
    const id = `node-${nodeType}-${state.workflow.version + 1}-${index}`
    const defaults: Record<NodeType, Pick<WorkflowNode, 'label' | 'config'>> = {
      event: { label: 'New event', config: { eventType: 'custom.event' } },
      transform: { label: 'Map fields', config: { mappings: [{ from: 'ticket.id', to: 'ticket.id' }] } },
      condition: { label: 'New condition', config: { field: 'ticket.urgency', operator: 'equals', value: 'urgent' } },
      assign: { label: 'Assign queue', config: { queue: 'general-support' } },
      notification: { label: 'Send notification', config: { channel: 'in_app', template: 'Workflow notification' } },
      delay: { label: 'Wait', config: { milliseconds: 1000 } },
      end: { label: 'End state', config: { outcome: 'complete' } },
    }
    const node: WorkflowNode = { id, type: nodeType, position: { x: Math.max(0, Math.min(1400, position.x)), y: Math.max(0, Math.min(600, position.y)) }, ...defaults[nodeType], config: config ?? defaults[nodeType].config, inputContract: [], outputContract: [] }
    const workflow: Workflow = { ...state.workflow, version: state.workflow.version + 1, updatedAt: new Date().toISOString(), nodes: [...state.workflow.nodes, node] }
    const history = { id: `history-${workflow.version}`, command: 'add_workflow_node', beforeVersion: state.workflow.version, afterVersion: workflow.version, reversible: true, timestamp: new Date().toISOString(), beforeWorkflow: state.workflow }
    dispatch({ type: 'update_workflow', workflow, history, activity: activity(source, 'add_workflow_node', 'success', `${node.label} added and selected.`, [node.id], { nodeType, expectedVersion }) })
    return node
  }, [state.workflow])

  const connectNodes = useCallback((sourceId: string, sourcePort: string, targetId: string, targetPort: string, expectedVersion: number, source: Source = 'webmcp') => {
    if (expectedVersion !== state.workflow.version) throw new Error(`Stale workflow version. Expected ${state.workflow.version}.`)
    if (state.workflow.edges.length >= 30) throw new Error('The 30-edge workflow limit was reached.')
    const edge = { id: `edge-${sourceId}-${sourcePort}-${targetId}`, source: sourceId, sourcePort, target: targetId, targetPort }
    const workflow: Workflow = { ...state.workflow, version: state.workflow.version + 1, updatedAt: new Date().toISOString(), edges: [...state.workflow.edges, edge] }
    const blocking = validateWorkflow(workflow).find((item) => ['SELF_CONNECTION', 'DUPLICATE_EDGE', 'INVALID_PORT', 'CYCLE', 'UNKNOWN_NODE'].includes(item.code))
    if (blocking) throw new Error(blocking.message)
    const history = { id: `history-${workflow.version}`, command: 'connect_workflow_nodes', beforeVersion: state.workflow.version, afterVersion: workflow.version, reversible: true, timestamp: new Date().toISOString(), beforeWorkflow: state.workflow }
    dispatch({ type: 'update_workflow', workflow, history, activity: activity(source, 'connect_workflow_nodes', 'success', 'Nodes connected and contracts revalidated.', [sourceId, targetId], { sourceId, sourcePort, targetId, targetPort, expectedVersion }) })
  }, [state.workflow])

  const moveNode = useCallback((nodeId: string, position: { x: number; y: number }, source: Source = 'human') => {
    const current = state.workflow.nodes.find((node) => node.id === nodeId)
    if (!current) throw new Error('Node not found.')
    const workflow: Workflow = { ...state.workflow, version: state.workflow.version + 1, updatedAt: new Date().toISOString(), nodes: state.workflow.nodes.map((node) => node.id === nodeId ? { ...node, position: { x: Math.round(position.x), y: Math.round(position.y) } } : node) }
    const history = { id: `history-${workflow.version}`, command: 'move_workflow_node', beforeVersion: state.workflow.version, afterVersion: workflow.version, reversible: true, timestamp: new Date().toISOString(), beforeWorkflow: state.workflow }
    dispatch({ type: 'update_workflow', workflow, history, activity: activity(source, 'move_workflow_node', 'success', `${current.label} repositioned.`, [nodeId], undefined, `(${current.position.x}, ${current.position.y}) → (${Math.round(position.x)}, ${Math.round(position.y)})`) })
  }, [state.workflow])

  const undo = useCallback((expectedVersion = state.workflow.version, source: Source = 'human') => {
    const last = state.history.at(-1)
    if (!last) throw new Error('There is no reversible workflow change.')
    if (expectedVersion !== state.workflow.version) throw new Error(`Stale workflow version. Expected ${state.workflow.version}.`)
    const restored = { ...last.beforeWorkflow, version: state.workflow.version + 1, updatedAt: new Date().toISOString() }
    const fixture = state.fixtures.find((item) => item.id === 'fixture-vip')!
    const run = simulateWorkflow(restored, fixture, state.runs.length + 1)
    dispatch({ type: 'undo', workflow: restored, run, activity: activity(source, 'undo_last_workflow_change', 'success', `Undo complete. VIP fixture is ${run.status} again.`, [run.id], { expectedVersion }, `v${state.workflow.version} → v${restored.version}`) })
  }, [state.fixtures, state.history, state.runs.length, state.workflow])

  const recordActivity = useCallback((toolName: string, status: ActivityEvent['status'], result: string, source: Source = 'system', entities: string[] = [], input?: unknown, diff?: string) => dispatch({ type: 'activity', activity: activity(source, toolName, status, result, entities, input, diff) }), [])
  const setToolCounts = useCallback((counts: AppState['toolCounts']) => dispatch({ type: 'tool_counts', counts }), [])
  const setWebmcpSupported = useCallback((supported: boolean) => dispatch({ type: 'webmcp_support', supported }), [])
  const setAccount = useCallback((role: 'admin' | 'viewer') => dispatch({ type: 'account', account: role === 'admin' ? { handle: 'HectorTa1989', role: 'admin', plan: 'admin' } : { handle: 'Guest operator', role: 'viewer', plan: 'free' } }), [])
  const closePaywall = useCallback(() => dispatch({ type: 'paywall', feature: null }), [])
  const reset = useCallback(() => {
    localStorage.removeItem(persistenceKey)
    dispatch({ type: 'reset', state: initialState() })
  }, [])

  const value = useMemo<Store>(() => ({ state, activeRun, validationIssues: validateWorkflow(state.workflow), isPro, runFixture, selectFixture, selectNode, selectRange, clearSelection, setPanel, previewFix, approvePatch, applyPatch, updateConditionField, addNode, connectNodes, moveNode, undo, recordActivity, setToolCounts, setWebmcpSupported, setAccount, requirePro, closePaywall, reset }), [activeRun, addNode, applyPatch, approvePatch, clearSelection, closePaywall, connectNodes, isPro, moveNode, previewFix, recordActivity, requirePro, reset, runFixture, selectFixture, selectNode, selectRange, setAccount, setPanel, setToolCounts, setWebmcpSupported, state, undo, updateConditionField])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAppStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider.')
  return store
}

function activity(source: Source, toolName: string, status: ActivityEvent['status'], resultSummary: string, entityIds: string[], input?: unknown, diff?: string): ActivityEvent {
  return {
    id: `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    toolName,
    status,
    inputSummary: input === undefined ? '—' : compact(input),
    resultSummary: resultSummary.slice(0, 300),
    entityIds: entityIds.slice(0, 20),
    diff,
    timestamp: new Date().toISOString(),
  }
}
