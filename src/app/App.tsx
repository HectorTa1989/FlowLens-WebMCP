import { Header } from '../features/header/Header'
import { LeftRail } from '../features/sidebar/LeftRail'
import { WorkflowCanvas } from '../features/canvas/WorkflowCanvas'
import { DetailPanel } from '../features/panel/DetailPanel'
import { Paywall } from '../features/paywall/Paywall'
import { useWebMCP } from '../webmcp/useWebMCP'

export function App() {
  useWebMCP()
  return (
    <main className="app-shell">
      <Header />
      <div className="workspace">
        <LeftRail />
        <WorkflowCanvas />
        <DetailPanel />
      </div>
      <Paywall />
    </main>
  )
}
