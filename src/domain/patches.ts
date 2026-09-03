import { validateWorkflow } from './validation'
import type { ApprovalToken, Patch, TraceSelection, Workflow } from './types'

export function previewConditionFieldPatch(workflow: Workflow, selection: TraceSelection, after: string, rationale: string): Patch {
  const condition = workflow.nodes.find((node) => node.id === 'node-condition' && selection.nodeIds.includes(node.id))
  if (!condition || condition.type !== 'condition') throw new Error('Select the condition step before previewing this repair.')
  if (!/^([a-z][a-z0-9_]*)(\.[a-z][a-z0-9_]*){1,3}$/i.test(after)) throw new Error('The field path is outside the restricted mapping DSL.')
  const before = (condition.config as { field: string }).field
  const candidate: Workflow = {
    ...workflow,
    nodes: workflow.nodes.map((node) => node.id === condition.id ? { ...node, config: { ...node.config, field: after } } : node),
  }
  const issues = validateWorkflow(candidate)
  return {
    id: `patch-v${workflow.version}-s${selection.selectionVersion}`,
    baseWorkflowVersion: workflow.version,
    selectionVersion: selection.selectionVersion,
    operations: [{ op: 'replace_condition_field', nodeId: condition.id, before, after }],
    rationale: rationale.slice(0, 280),
    validationResult: { valid: issues.length === 0, issues },
    approvalState: 'previewed',
  }
}

export function createApprovalToken(patch: Patch, now = Date.now()): ApprovalToken {
  if (!patch.validationResult.valid || patch.approvalState !== 'previewed') throw new Error('Only a valid current preview can be approved.')
  return {
    value: `approval-${patch.id}-${now.toString(36)}`,
    patchId: patch.id,
    workflowVersion: patch.baseWorkflowVersion,
    selectionVersion: patch.selectionVersion,
    expiresAt: now + 5 * 60 * 1000,
    used: false,
  }
}

export function applyApprovedPatch(workflow: Workflow, patch: Patch, approval: ApprovalToken, selection: TraceSelection, now = Date.now()): Workflow {
  if (approval.used) throw new Error('This approval token has already been used.')
  if (approval.expiresAt <= now) throw new Error('This approval token expired. Approve the preview again.')
  if (approval.patchId !== patch.id || patch.approvalState !== 'approved') throw new Error('Approval does not match the current patch.')
  if (workflow.version !== patch.baseWorkflowVersion || approval.workflowVersion !== workflow.version) throw new Error('The workflow changed after preview. Stage a new patch.')
  if (selection.selectionVersion !== patch.selectionVersion || approval.selectionVersion !== selection.selectionVersion) throw new Error('The selection changed after preview. Select the failure again.')
  const operation = patch.operations[0]
  return {
    ...workflow,
    version: workflow.version + 1,
    updatedAt: new Date(now).toISOString(),
    nodes: workflow.nodes.map((node) => node.id === operation.nodeId ? { ...node, config: { ...node.config, field: operation.after } } : node),
  }
}

export function compareRuns(before: import('./types').Run, after: import('./types').Run) {
  const beforeBranch = before.steps.find((step) => step.branch)?.branch ?? 'none'
  const afterBranch = after.steps.find((step) => step.branch)?.branch ?? 'none'
  return {
    beforeId: before.id,
    afterId: after.id,
    branchChanged: beforeBranch !== afterBranch,
    beforeBranch,
    afterBranch,
    outcomeChanged: before.actualOutcome !== after.actualOutcome,
    beforeOutcome: before.actualOutcome,
    afterOutcome: after.actualOutcome,
    validationChanged: before.status !== after.status,
  }
}
