import { Bell, Braces, CircleStop, Clock3, GitBranch, Play, Radio, RotateCcw, Route, Sparkles, Users } from 'lucide-react'
import { useAppStore } from '../../app/store'
import type { NodeType } from '../../domain/types'

const catalog: { type: NodeType; label: string; icon: typeof Radio }[] = [
  { type: 'event', label: 'Event', icon: Radio },
  { type: 'transform', label: 'Transform', icon: Braces },
  { type: 'condition', label: 'Condition', icon: GitBranch },
  { type: 'assign', label: 'Assign', icon: Users },
  { type: 'notification', label: 'Notify', icon: Bell },
  { type: 'delay', label: 'Delay', icon: Clock3 },
  { type: 'end', label: 'End', icon: CircleStop },
]

export function LeftRail() {
  const { state, activeRun, validationIssues, selectFixture, runFixture, addNode, reset } = useAppStore()
  return (
    <aside className="left-rail pane">
      <section>
        <div className="section-heading">
          <span className="eyebrow">Node library</span>
          <span className="count-pill">{catalog.length}</span>
        </div>
        <div className="node-library">
          {catalog.map(({ type, label, icon: Icon }, index) => (
            <button key={type} onClick={() => addNode(type, { x: 560 + (index % 2) * 220, y: 430 + Math.floor(index / 2) * 120 }, state.workflow.version, 'human')} title={`Add ${label.toLowerCase()} node`}>
              <Icon size={15} /><span>{label}</span><i>+</i>
            </button>
          ))}
        </div>
      </section>

      <section className="fixture-section">
        <div className="section-heading">
          <span className="eyebrow">Fixtures</span>
          <span className={`validation-dot ${validationIssues.length ? 'warning' : ''}`}>{validationIssues.length ? `${validationIssues.length} issue${validationIssues.length > 1 ? 's' : ''}` : 'Valid'}</span>
        </div>
        <div className="fixture-list">
          {state.fixtures.map((fixture) => {
            const latest = [...state.runs].reverse().find((run) => run.fixtureId === fixture.id)
            return (
              <button key={fixture.id} className={state.selectedFixtureId === fixture.id ? 'active' : ''} onClick={() => selectFixture(fixture.id)}>
                <span className={`fixture-icon ${fixture.badge}`}><Route size={15} /></span>
                <span className="fixture-copy"><strong>{fixture.name}</strong><small>{fixture.eventType}</small></span>
                <span className={`run-status ${latest?.status}`}>{latest?.status === 'passed' ? 'Passed' : latest?.status === 'failed' ? 'Review' : 'Ready'}</span>
              </button>
            )
          })}
        </div>
        <button className="run-button" onClick={() => runFixture()}>
          <Play size={15} fill="currentColor" /><span>Run selected fixture</span><kbd>⌘ ↵</kbd>
        </button>
      </section>

      <section className="flight-card">
        <div className="flight-orbit"><Sparkles size={18} /></div>
        <span className="eyebrow">Flight recorder</span>
        <strong>{activeRun?.steps.length ?? 0} steps captured</strong>
        <p>Inputs, outputs, branches and simulated effects are retained as bounded evidence.</p>
        <div><span>Network calls</span><b>0</b></div>
        <div><span>Real side effects</span><b>0</b></div>
      </section>

      <button className="reset-link" onClick={reset}><RotateCcw size={14} /> Restore seeded demo</button>
    </aside>
  )
}
