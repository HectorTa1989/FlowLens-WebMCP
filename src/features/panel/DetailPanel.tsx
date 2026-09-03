import { Activity, AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Code2, Diff, Eye, GitCompareArrows, LockKeyhole, PanelRight, ShieldCheck, Sparkles, Undo2, X, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { compareRuns } from '../../domain/patches'
import { compact } from '../../domain/redaction'
import type { AppState, RunStep } from '../../domain/types'

const tabs: { id: AppState['activePanel']; label: string; icon: typeof Eye }[] = [
  { id: 'inspect', label: 'Inspect', icon: PanelRight },
  { id: 'trace', label: 'Trace', icon: Activity },
  { id: 'patch', label: 'Patch', icon: Diff },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
  { id: 'activity', label: 'Activity', icon: Bot },
]

export function DetailPanel() {
  const { state, setPanel } = useAppStore()
  return (
    <aside className="detail-panel pane">
      <nav className="panel-tabs" aria-label="Workflow details">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={state.activePanel === id ? 'active' : ''} onClick={() => setPanel(id)} aria-label={label} title={label}>
            <Icon size={15} /><span>{label}</span>
            {id === 'patch' && state.patch && <i />}
            {id === 'activity' && state.activities.length > 0 && <b>{Math.min(99, state.activities.length)}</b>}
          </button>
        ))}
      </nav>
      <div className="panel-content">
        {state.activePanel === 'inspect' && <Inspector />}
        {state.activePanel === 'trace' && <TracePanel />}
        {state.activePanel === 'patch' && <PatchPanel />}
        {state.activePanel === 'compare' && <ComparisonPanel />}
        {state.activePanel === 'activity' && <ActivityPanel />}
      </div>
    </aside>
  )
}

function Inspector() {
  const { state, validationIssues, updateConditionField } = useAppStore()
  const node = state.workflow.nodes.find((item) => item.id === state.selectedNodeId)
  const conditionField = node?.type === 'condition' ? (node.config as { field: string }).field : ''
  const [field, setField] = useState(conditionField)

  if (!node) return <EmptyState icon={Eye} title="Select a node" body="Choose a node on the canvas to inspect its safe configuration and contracts." />
  const issues = validationIssues.filter((issue) => issue.entityId === node.id)
  return (
    <div className="panel-stack">
      <PanelHeader eyebrow="Node inspector" title={node.label} meta={`${node.type} · ${node.id}`} />
      <div className="status-strip"><span className={issues.length ? 'danger' : 'success'}>{issues.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}{issues.length ? `${issues.length} issue` : 'Configuration valid'}</span><b>v{state.workflow.version}</b></div>
      <section className="inspector-card">
        <label>Node label<input value={node.label} readOnly /></label>
        {node.type === 'condition' && (
          <>
            <label>Field path<input key={conditionField} defaultValue={conditionField} onChange={(event) => setField(event.target.value)} /></label>
            <div className="inline-fields"><label>Operator<input value={(node.config as { operator: string }).operator} readOnly /></label><label>Value<input value={(node.config as { value: string }).value} readOnly /></label></div>
            <button className="secondary-button" onClick={() => updateConditionField(field || conditionField, state.workflow.version)}>Save versioned change</button>
          </>
        )}
        {node.type !== 'condition' && <pre>{JSON.stringify(node.config, null, 2)}</pre>}
      </section>
      <section className="contract-card">
        <div className="card-heading"><span><Code2 size={15} />Contracts</span><small>typed</small></div>
        <ContractList label="Input" fields={node.inputContract} />
        <ContractList label="Output" fields={node.outputContract} />
      </section>
    </div>
  )
}

function ContractList({ label, fields }: { label: string; fields: { path: string; type: string; required: boolean }[] }) {
  return <div className="contract-row"><b>{label}</b><div>{fields.length ? fields.map((field) => <code key={field.path}>{field.path}<i>{field.type}</i></code>) : <small>No required fields</small>}</div></div>
}

function TracePanel() {
  const { state, activeRun, selectRange, clearSelection } = useAppStore()
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  if (!activeRun) return <EmptyState icon={Activity} title="No trace yet" body="Run a fixture to capture deterministic workflow evidence." />

  const selectionContains = (index: number) => state.selection?.runId === activeRun.id && index >= state.selection.startIndex && index <= state.selection.endIndex
  const selectStep = (index: number, shiftKey: boolean) => {
    if (shiftKey && state.selection?.runId === activeRun.id) selectRange(state.selection.startIndex, index)
    else selectRange(index, index)
  }

  return (
    <div className="panel-stack trace-panel">
      <PanelHeader eyebrow="Flight recorder" title={activeRun.fixtureName} meta={`${activeRun.steps.length} deterministic steps · ${activeRun.steps.reduce((sum, step) => sum + step.durationMs, 0)}ms pseudo-time`} />
      <div className={`run-summary-card ${activeRun.status}`}>
        <span>{activeRun.status === 'failed' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}</span>
        <div><strong>{activeRun.status === 'failed' ? 'Expected outcome not reached' : 'Expected outcome verified'}</strong><small>{activeRun.expectedOutcome} expected · {activeRun.actualOutcome} observed</small></div>
        <b>{activeRun.status}</b>
      </div>
      <div className="selection-help"><span><Sparkles size={14} /> Drag across evidence to bind agent context</span>{state.selection && <button onClick={() => clearSelection()}><X size={13} /> Clear</button>}</div>
      <ol className="trace-list" onPointerLeave={() => { if (dragStart !== null && dragEnd !== null) selectRange(dragStart, dragEnd); setDragStart(null); setDragEnd(null) }}>
        {activeRun.steps.map((step, index) => (
          <TraceStep
            key={step.id}
            step={step}
            index={index}
            selected={selectionContains(index) || (dragStart !== null && dragEnd !== null && index >= Math.min(dragStart, dragEnd) && index <= Math.max(dragStart, dragEnd))}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragStart(index); setDragEnd(index) }}
            onPointerEnter={() => { if (dragStart !== null) setDragEnd(index) }}
            onPointerUp={() => { if (dragStart !== null) selectRange(dragStart, dragEnd ?? index); setDragStart(null); setDragEnd(null) }}
            onClick={(event) => selectStep(index, event.shiftKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') selectStep(index, event.shiftKey)
              if (event.shiftKey && event.key === 'ArrowDown') { event.preventDefault(); selectRange(state.selection?.startIndex ?? index, Math.min(activeRun.steps.length - 1, index + 1)) }
              if (event.shiftKey && event.key === 'ArrowUp') { event.preventDefault(); selectRange(state.selection?.endIndex ?? index, Math.max(0, index - 1)) }
            }}
          />
        ))}
      </ol>
    </div>
  )
}

function TraceStep({ step, index, selected, ...handlers }: { step: RunStep; index: number; selected: boolean; onPointerDown: React.PointerEventHandler<HTMLButtonElement>; onPointerEnter: React.PointerEventHandler<HTMLButtonElement>; onPointerUp: React.PointerEventHandler<HTMLButtonElement>; onClick: React.MouseEventHandler<HTMLButtonElement>; onKeyDown: React.KeyboardEventHandler<HTMLButtonElement> }) {
  const [open, setOpen] = useState(step.status === 'failed')
  return (
    <li className={`${step.status} ${selected ? 'selected' : ''}`}>
      <button className="trace-step-button" {...handlers} aria-pressed={selected}>
        <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="step-status">{step.status === 'failed' ? <X size={11} /> : <Check size={11} />}</span>
        <span className="step-copy"><strong>{step.nodeLabel}</strong><small>{step.branch ? `Branch · ${step.branch}` : `${step.durationMs}ms`}</small></span>
        {step.error && <span className="evidence-badge">Evidence</span>}
        <ChevronRight size={14} className={open ? 'open' : ''} onClick={(event) => { event.stopPropagation(); setOpen((value) => !value) }} />
      </button>
      {open && (
        <div className="step-evidence">
          {step.error && <div className="error-evidence"><AlertTriangle size={13} /><span>{step.error}</span></div>}
          <details><summary>Input</summary><pre>{compact(step.input, 800)}</pre></details>
          <details><summary>Output</summary><pre>{compact(step.output, 800)}</pre></details>
        </div>
      )}
    </li>
  )
}

function PatchPanel() {
  const { state, isPro, previewFix, approvePatch, applyPatch, requirePro } = useAppStore()
  const [error, setError] = useState('')
  const patch = state.patch
  const safely = (fn: () => unknown) => { try { setError(''); fn() } catch (value) { setError(value instanceof Error ? value.message : String(value)) } }

  if (!patch) return (
    <div className="panel-stack">
      <PanelHeader eyebrow="Safe repair" title="Patch review" meta="Preview · approve · apply" />
      <div className="patch-empty">
        <div className="diff-orb"><Diff size={22} /></div>
        <strong>{state.selection ? 'Evidence selected' : 'Select the failed path first'}</strong>
        <p>{state.selection ? 'Stage the smallest contract-aligned repair. The preview validates without mutating the workflow.' : 'Select Normalize payload and VIP & urgent? in the trace to create immutable agent context.'}</p>
        <button className="primary-button" disabled={!state.selection} onClick={() => isPro ? safely(() => previewFix()) : requirePro('AI-assisted repair previews')}>
          {isPro ? <Sparkles size={15} /> : <LockKeyhole size={15} />} Stage smallest repair
        </button>
      </div>
      {error && <InlineError message={error} />}
    </div>
  )

  const operation = patch.operations[0]
  const approved = patch.approvalState === 'approved' && state.approval && !state.approval.used
  return (
    <div className="panel-stack">
      <PanelHeader eyebrow="Safe repair" title="Patch review" meta={`${patch.id} · non-mutating preview`} />
      <div className="patch-state-line"><span className={patch.validationResult.valid ? 'success' : 'danger'}>{patch.validationResult.valid ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}{patch.validationResult.valid ? 'Validation passed' : 'Validation failed'}</span><b>Base v{patch.baseWorkflowVersion}</b></div>
      <section className="diff-card">
        <div className="diff-header"><span><Code2 size={14} />{operation.nodeId}</span><small>1 line changed</small></div>
        <div className="diff-line removed"><i>−</i><code>{operation.before}</code></div>
        <div className="diff-line added"><i>+</i><code>{operation.after}</code></div>
      </section>
      <section className="rationale-card"><span className="eyebrow">Agent rationale</span><p>{patch.rationale}</p><div><CheckCircle2 size={14} /> Restricted to the selected condition node</div></section>
      {!approved && patch.approvalState !== 'applied' && <button className="approve-button" onClick={() => safely(approvePatch)}><ClipboardCheck size={16} /> Approve patch <span>Human action required</span></button>}
      {approved && (
        <section className="approval-card">
          <div><span className="approval-icon"><Check size={14} /></span><span><strong>Human approved</strong><small>Apply tool is available for 5 minutes</small></span></div>
          <label>Single-use token<code>{state.approval!.value}</code></label>
          <button className="primary-button" onClick={() => safely(() => applyPatch(state.approval!.value, 'human'))}><Sparkles size={15} /> Apply & rerun fixture</button>
        </section>
      )}
      {patch.approvalState === 'applied' && <div className="success-callout"><CheckCircle2 size={18} /><span><strong>Repair applied</strong><small>The approval token was consumed and the fixture reran.</small></span></div>}
      {error && <InlineError message={error} />}
    </div>
  )
}

function ComparisonPanel() {
  const { state, requirePro, isPro, setPanel } = useAppStore()
  const vipRuns = state.runs.filter((run) => run.fixtureId === 'fixture-vip')
  const after = vipRuns.at(-1)
  const before = after ? [...vipRuns].reverse().find((run) => run.id !== after.id && run.workflowVersion !== after.workflowVersion) ?? vipRuns.at(-2) : undefined
  if (!isPro) return <LockedState feature="Run comparison" onUpgrade={() => requirePro('Before-and-after run comparison')} />
  if (!before || !after || before.id === after.id) return <EmptyState icon={GitCompareArrows} title="Two runs needed" body="Apply the approved patch and rerun the VIP fixture to unlock a before-and-after proof." action={<button className="secondary-button" onClick={() => setPanel('patch')}>Open patch review</button>} />
  const comparison = compareRuns(before, after)
  return (
    <div className="panel-stack">
      <PanelHeader eyebrow="Proof of repair" title="Before & after" meta={`${before.id} ↔ ${after.id}`} />
      <div className="comparison-hero"><span className="before">{before.status}<small>v{before.workflowVersion}</small></span><ArrowRight size={18} /><span className="after">{after.status}<small>v{after.workflowVersion}</small></span></div>
      <div className="comparison-grid">
        <CompareRow label="Condition branch" before={comparison.beforeBranch} after={comparison.afterBranch} changed={comparison.branchChanged} />
        <CompareRow label="Final outcome" before={comparison.beforeOutcome} after={comparison.afterOutcome} changed={comparison.outcomeChanged} />
        <CompareRow label="Validation" before={before.status} after={after.status} changed={comparison.validationChanged} />
        <CompareRow label="Assignment" before={queueFromRun(before)} after={queueFromRun(after)} changed={queueFromRun(before) !== queueFromRun(after)} />
      </div>
      <div className="proof-callout"><ShieldCheck size={18} /><span><strong>Deterministic proof</strong><small>Same fixture. One versioned field change. No external side effects.</small></span></div>
    </div>
  )
}

function CompareRow({ label, before, after, changed }: { label: string; before: string; after: string; changed: boolean }) {
  return <div className="compare-row"><span>{label}{changed && <small>changed</small>}</span><code>{before}</code><ArrowRight size={13} /><code className="after">{after}</code></div>
}

function ActivityPanel() {
  const { state } = useAppStore()
  return (
    <div className="panel-stack">
      <PanelHeader eyebrow="Agent observability" title="Tool activity" meta={`${state.activities.length} retained events · bounded at 100`} />
      <div className="scope-counter">
        <div><span>Page</span><b>{state.toolCounts.page}</b></div><div><span>Selection</span><b>{state.toolCounts.selection}</b></div><div><span>Approval</span><b>{state.toolCounts.approval}</b></div>
      </div>
      {!state.webmcpSupported && state.toolCounts.page === 0 && <div className="unsupported-card"><AlertTriangle size={15} /><span><strong>WebMCP unavailable in this browser</strong><small>The manual product is active. No fallback is presented as WebMCP.</small></span></div>}
      <ol className="activity-list">
        {[...state.activities].reverse().map((item) => (
          <li key={item.id} className={item.status}>
            <span className="activity-icon">{activityIcon(item.status)}</span>
            <div><div><strong>{item.toolName}</strong><small>{item.source}</small><time>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div><p>{item.resultSummary}</p>{item.diff && <code>{item.diff}</code>}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function activityIcon(status: string) {
  if (status === 'success' || status === 'registered') return <Check size={12} />
  if (status === 'failure') return <X size={12} />
  if (status === 'pending') return <Clock3 size={12} />
  return <Activity size={12} />
}

function queueFromRun(run: NonNullable<ReturnType<typeof useAppStore>['activeRun']>) {
  return String((run.steps.find((step) => step.nodeId.includes('standard') || step.nodeId.includes('escalate'))?.output.assignment as { queue?: string } | undefined)?.queue ?? 'none')
}

function PanelHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return <div className="panel-header"><span className="eyebrow">{eyebrow}</span><strong>{title}</strong><small>{meta}</small></div>
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Eye; title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span><Icon size={22} /></span><strong>{title}</strong><p>{body}</p>{action}</div>
}

function LockedState({ feature, onUpgrade }: { feature: string; onUpgrade: () => void }) {
  return <div className="empty-state locked"><span><LockKeyhole size={22} /></span><strong>{feature} is Pro</strong><p>Upgrade through Polar to unlock repair proof, patch history, and advanced diagnostics.</p><button className="primary-button" onClick={onUpgrade}>View Pro access</button></div>
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-error"><AlertTriangle size={14} />{message}</div>
}
