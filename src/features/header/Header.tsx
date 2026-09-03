import { ChevronDown, CloudLightning, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../app/store'

export function Header() {
  const { state, isPro, setAccount, reset, undo } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const totalTools = state.toolCounts.page + state.toolCounts.selection + state.toolCounts.approval
  const toolsLive = state.webmcpSupported || totalTools > 0

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark"><Sparkles size={16} strokeWidth={2.2} /></div>
        <div>
          <strong>FlowLens</strong>
          <span>Workflow intelligence, in focus</span>
        </div>
      </div>

      <div className="workflow-title">
        <span>{state.workflow.name}</span>
        <small>v{state.workflow.version}</small>
      </div>

      <div className="header-actions">
        <div className={`webmcp-chip ${toolsLive ? 'is-live' : ''}`} title={toolsLive ? 'WebMCP imperative tools registered' : 'Manual mode remains fully available'}>
          <CloudLightning size={14} />
          <span>{toolsLive ? `${totalTools} tools live` : 'Manual mode'}</span>
          <i />
        </div>
        <button className="icon-button" onClick={() => undo()} disabled={!state.history.length} aria-label="Undo last workflow change" title="Undo last change">
          <Undo2 size={16} />
        </button>
        <button className="icon-button" onClick={reset} aria-label="Reset workspace" title="Reset demo workspace">
          <RotateCcw size={16} />
        </button>
        <div className="account-menu">
          <button className="account-trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            <span className="avatar">HT</span>
            <span className="account-copy"><strong>{state.account.handle}</strong><small>{isPro ? 'Admin · All access' : 'Free workspace'}</small></span>
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="account-popover">
              <span className="eyebrow">Local demo persona</span>
              <button className={state.account.role === 'admin' ? 'selected' : ''} onClick={() => { setAccount('admin'); setMenuOpen(false) }}>
                <span className="avatar small">HT</span><span><strong>HectorTa1989</strong><small>Admin bypass · Pro</small></span>
              </button>
              <button className={state.account.role === 'viewer' ? 'selected' : ''} onClick={() => { setAccount('viewer'); setMenuOpen(false) }}>
                <span className="avatar small guest">GO</span><span><strong>Guest operator</strong><small>Free · Polar gated</small></span>
              </button>
              <p>Personas are local-only. Production access must come from verified Polar customer state.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
