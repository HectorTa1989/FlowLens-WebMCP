import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { Bell, Braces, Check, CircleStop, Clock3, GitBranch, Radio, Users, X } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../../app/store'
import type { NodeType } from '../../domain/types'

type FlowData = { label: string; type: NodeType; runStatus?: 'success' | 'failed'; selectedByTrace: boolean; branch?: 'true' | 'false' }

const icons = { event: Radio, transform: Braces, condition: GitBranch, assign: Users, notification: Bell, delay: Clock3, end: CircleStop }

function FlowNode({ data, selected }: NodeProps<Node<FlowData>>) {
  const Icon = icons[data.type]
  return (
    <div className={`flow-node type-${data.type} ${selected || data.selectedByTrace ? 'selected' : ''} ${data.runStatus ?? ''}`}>
      {data.type !== 'event' && <Handle type="target" position={Position.Left} id="input" />}
      <div className="node-icon"><Icon size={16} /></div>
      <div className="node-label"><small>{data.type}</small><strong>{data.label}</strong></div>
      {data.runStatus && <span className="node-result">{data.runStatus === 'success' ? <Check size={12} /> : <X size={12} />}</span>}
      {data.type === 'condition' ? (
        <>
          <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} />
          <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} />
          <span className="port-label true">true</span><span className="port-label false">false</span>
        </>
      ) : data.type !== 'end' ? <Handle type="source" position={Position.Right} id="output" /> : null}
    </div>
  )
}

const nodeTypes = { flowNode: FlowNode }

export function WorkflowCanvas() {
  const { state, activeRun, selectNode, selectRange, moveNode, connectNodes } = useAppStore()
  const executedNodeIds = activeRun?.steps.map((step) => step.nodeId) ?? []
  const selectedIds = new Set(state.selection?.nodeIds ?? (state.selectedNodeId ? [state.selectedNodeId] : []))
  const failedNode = activeRun?.steps.find((step) => step.status === 'failed')?.nodeId

  const nodes = useMemo<Node<FlowData>[]>(() => state.workflow.nodes.map((node) => ({
    id: node.id,
    type: 'flowNode',
    position: node.position,
    selected: state.selectedNodeId === node.id,
    data: { label: node.label, type: node.type, selectedByTrace: selectedIds.has(node.id), runStatus: executedNodeIds.includes(node.id) ? (node.id === failedNode ? 'failed' : 'success') : undefined },
  })), [executedNodeIds.join(','), failedNode, selectedIds, state.selectedNodeId, state.workflow.nodes])

  const edges = useMemo<Edge[]>(() => state.workflow.edges.map((edge) => {
    const sourceIndex = executedNodeIds.indexOf(edge.source)
    const active = sourceIndex >= 0 && executedNodeIds[sourceIndex + 1] === edge.target
    const selected = selectedIds.has(edge.source) && selectedIds.has(edge.target)
    const isFailurePath = activeRun?.status === 'failed' && active
    return {
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourcePort,
      target: edge.target,
      targetHandle: edge.targetPort,
      animated: active,
      className: `${active ? 'executed' : ''} ${selected ? 'selected-path' : ''} ${isFailurePath ? 'failed-path' : ''}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      label: edge.sourcePort === 'true' || edge.sourcePort === 'false' ? edge.sourcePort : undefined,
      labelStyle: { fill: '#8c8f99', fontSize: 10, fontWeight: 600 },
    }
  }), [activeRun?.status, executedNodeIds.join(','), selectedIds, state.workflow.edges])

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    connectNodes(connection.source, connection.sourceHandle ?? 'output', connection.target, connection.targetHandle ?? 'input', state.workflow.version, 'human')
  }

  const selectFailurePath = () => {
    if (!activeRun) return
    const conditionIndex = activeRun.steps.findIndex((step) => step.nodeId === 'node-condition')
    selectRange(Math.max(0, conditionIndex - 1), conditionIndex)
  }

  return (
    <section className="canvas-pane pane">
      <div className="canvas-toolbar">
        <div>
          <span className="eyebrow">Workflow canvas</span>
          <strong>{state.workflow.nodes.length} nodes · {state.workflow.edges.length} edges</strong>
        </div>
        <div className="canvas-actions">
          {activeRun?.status === 'failed' && <button className="focus-failure" onClick={selectFailurePath}><span /> Select failed path</button>}
          <span className={`run-pill ${activeRun?.status}`}><i /> {activeRun?.status === 'failed' ? 'Outcome mismatch' : activeRun?.status === 'passed' ? 'Verified run' : 'Ready'}</span>
        </div>
      </div>
      {state.selection && (
        <div className="selection-banner">
          <span className="selection-pulse" />
          <strong>{state.selection.stepIds.length} selected step{state.selection.stepIds.length > 1 ? 's' : ''}</strong>
          <span>Agent context bound to run {state.selection.runId.replace('run-', '')}</span>
          <div><b>{state.toolCounts.selection}</b> selection tools</div>
        </div>
      )}
      <div className="flow-wrap">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          onNodeDragStop={(_, node) => moveNode(node.id, node.position)}
          onConnect={onConnect}
          minZoom={0.45}
          maxZoom={1.6}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          colorMode="dark"
        >
          <Background color="#292b31" gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(node) => node.id === failedNode ? '#ff6b6b' : selectedIds.has(node.id) ? '#57a8ff' : '#42454d'} maskColor="rgba(8,9,11,.72)" />
        </ReactFlow>
        <div className="canvas-legend"><span><i className="blue" />Selected context</span><span><i className="red" />Verified failure</span><span><i className="green" />Executed</span></div>
      </div>
    </section>
  )
}
