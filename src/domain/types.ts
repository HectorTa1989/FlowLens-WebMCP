export type NodeType = 'event' | 'transform' | 'condition' | 'assign' | 'notification' | 'delay' | 'end'

export type ContractField = {
  path: string
  type: 'string' | 'number' | 'boolean' | 'object'
  required: boolean
}

export type FieldMapping = {
  from: string
  to: string
  defaultValue?: string
}

export type NodeConfig =
  | { eventType: string }
  | { mappings: FieldMapping[] }
  | { field: string; operator: 'equals' | 'not_equals' | 'exists'; value?: string }
  | { queue: string }
  | { channel: 'in_app' | 'email'; template: string }
  | { milliseconds: number }
  | { outcome: string }

export type WorkflowNode = {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  config: NodeConfig
  inputContract: ContractField[]
  outputContract: ContractField[]
}

export type WorkflowEdge = {
  id: string
  source: string
  sourcePort: string
  target: string
  targetPort: string
}

export type Workflow = {
  id: string
  name: string
  version: number
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export type Fixture = {
  id: string
  name: string
  eventType: string
  payload: Record<string, unknown>
  expectedOutcome: string
  badge: 'baseline' | 'investigate'
}

export type ValidationIssue = {
  id: string
  severity: 'error' | 'warning'
  entityId: string
  code: string
  message: string
  suggestedAction: string
}

export type RunStep = {
  id: string
  nodeId: string
  nodeLabel: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  branch?: 'true' | 'false'
  status: 'success' | 'failed' | 'cancelled'
  durationMs: number
  error?: string
  timestamp: string
}

export type Run = {
  id: string
  workflowVersion: number
  fixtureId: string
  fixtureName: string
  expectedOutcome: string
  actualOutcome: string
  status: 'passed' | 'failed' | 'cancelled'
  startedAt: string
  finishedAt: string
  steps: RunStep[]
}

export type TraceSelection = {
  runId: string
  stepIds: string[]
  nodeIds: string[]
  startIndex: number
  endIndex: number
  selectionVersion: number
}

export type PatchOperation = {
  op: 'replace_condition_field'
  nodeId: string
  before: string
  after: string
}

export type Patch = {
  id: string
  baseWorkflowVersion: number
  selectionVersion: number
  operations: PatchOperation[]
  rationale: string
  validationResult: { valid: boolean; issues: ValidationIssue[] }
  approvalState: 'previewed' | 'approved' | 'applied' | 'stale'
}

export type ApprovalToken = {
  value: string
  patchId: string
  workflowVersion: number
  selectionVersion: number
  expiresAt: number
  used: boolean
}

export type ActivityStatus = 'pending' | 'success' | 'failure' | 'cancelled' | 'registered' | 'unregistered'

export type ActivityEvent = {
  id: string
  source: 'human' | 'webmcp' | 'system'
  toolName: string
  status: ActivityStatus
  inputSummary: string
  resultSummary: string
  entityIds: string[]
  diff?: string
  timestamp: string
}

export type HistoryEvent = {
  id: string
  command: string
  beforeVersion: number
  afterVersion: number
  reversible: boolean
  timestamp: string
  beforeWorkflow: Workflow
}

export type Account = {
  handle: string
  role: 'admin' | 'viewer'
  plan: 'admin' | 'free'
}

export type ToolScopeCounts = {
  page: number
  selection: number
  approval: number
}

export type AppState = {
  workflow: Workflow
  fixtures: Fixture[]
  runs: Run[]
  activeRunId: string | null
  selectedFixtureId: string
  selectedNodeId: string | null
  selection: TraceSelection | null
  selectionSequence: number
  patch: Patch | null
  approval: ApprovalToken | null
  activities: ActivityEvent[]
  history: HistoryEvent[]
  activePanel: 'inspect' | 'trace' | 'patch' | 'compare' | 'activity'
  account: Account
  paywallFeature: string | null
  toolCounts: ToolScopeCounts
  webmcpSupported: boolean
}

export type RunComparison = {
  beforeId: string
  afterId: string
  branchChanged: boolean
  beforeBranch: string
  afterBranch: string
  outcomeChanged: boolean
  beforeOutcome: string
  afterOutcome: string
  validationChanged: boolean
}
