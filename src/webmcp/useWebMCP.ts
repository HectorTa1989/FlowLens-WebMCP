import { useEffect, useRef } from 'react'
import { useAppStore, type Store } from '../app/store'
import { createApprovalTool, createPageTools, createSelectionTools, createUndoTool, summarizeToolError } from './tools'
import type { WebMCPTool } from './types'

export function useWebMCP() {
  const store = useAppStore()
  const storeRef = useRef<Store>(store)
  const countsRef = useRef({ page: 0, selection: 0, approval: 0 })
  storeRef.current = store

  const setScopeCount = (scope: keyof typeof countsRef.current, count: number) => {
    countsRef.current = { ...countsRef.current, [scope]: count }
    storeRef.current.setToolCounts(countsRef.current)
  }

  useEffect(() => {
    const modelContext = document.modelContext
    const supported = Boolean(modelContext)
    storeRef.current.setWebmcpSupported(supported)
    if (!modelContext) return
    const controller = new AbortController()
    const tools = createPageTools(() => storeRef.current)
    registerScope(modelContext, tools, controller, 'page', () => setScopeCount('page', tools.length), storeRef.current)
    const onToolChange = () => storeRef.current.recordActivity('toolchange', 'success', 'Browser reported an updated WebMCP tool surface.')
    modelContext.addEventListener?.('toolchange', onToolChange)
    return () => {
      controller.abort()
      modelContext.removeEventListener?.('toolchange', onToolChange)
      setScopeCount('page', 0)
      storeRef.current.recordActivity('page_scope', 'unregistered', 'Page-scoped tools removed.')
    }
  }, [])

  useEffect(() => {
    const modelContext = document.modelContext
    const selection = store.state.selection
    if (!modelContext || !selection) {
      setScopeCount('selection', 0)
      return
    }
    const controller = new AbortController()
    const tools = createSelectionTools(() => storeRef.current, selection, store.state.workflow.version)
    registerScope(modelContext, tools, controller, 'selection', () => setScopeCount('selection', tools.length), storeRef.current)
    return () => {
      controller.abort()
      setScopeCount('selection', 0)
      storeRef.current.recordActivity('selection_scope', 'unregistered', 'Previous selection tools removed.', 'system', selection.nodeIds)
    }
  }, [store.state.selection?.selectionVersion, store.state.workflow.version])

  useEffect(() => {
    const modelContext = document.modelContext
    const approval = store.state.approval
    if (!modelContext || !approval || approval.used || store.state.patch?.approvalState !== 'approved') {
      setScopeCount('approval', 0)
      return
    }
    const controller = new AbortController()
    const tools = [createApprovalTool(() => storeRef.current, approval.value)]
    registerScope(modelContext, tools, controller, 'approval', () => setScopeCount('approval', 1), storeRef.current)
    return () => {
      controller.abort()
      setScopeCount('approval', 0)
      storeRef.current.recordActivity('approval_scope', 'unregistered', 'Approval-scoped apply tool removed.')
    }
  }, [store.state.approval?.value, store.state.approval?.used, store.state.patch?.approvalState])

  useEffect(() => {
    const modelContext = document.modelContext
    if (!modelContext || store.state.history.length === 0) return
    const controller = new AbortController()
    const undo = createUndoTool(() => storeRef.current)
    registerScope(modelContext, [undo], controller, 'page', () => setScopeCount('page', 11), storeRef.current)
    return () => {
      controller.abort()
      if (document.modelContext) setScopeCount('page', 10)
    }
  }, [store.state.history.length > 0])
}

async function registerScope(modelContext: NonNullable<Document['modelContext']>, tools: WebMCPTool[], controller: AbortController, scope: 'page' | 'selection' | 'approval', onReady: () => void, store: Store) {
  try {
    await Promise.all(tools.map((definition) => modelContext.registerTool(wrapActivity(definition, store), { signal: controller.signal })))
    onReady()
    store.recordActivity(`${scope}_scope`, 'registered', `${tools.length} ${scope}-scoped tool${tools.length === 1 ? '' : 's'} registered.`, 'system', tools.map((item) => item.name))
  } catch (error) {
    if (controller.signal.aborted) return
    store.recordActivity(`${scope}_scope`, 'failure', summarizeToolError(error))
  }
}

function wrapActivity(definition: WebMCPTool, store: Store): WebMCPTool {
  return {
    ...definition,
    execute: async (input, options) => {
      store.recordActivity(definition.name, 'pending', 'Tool execution started.', 'webmcp', [], input)
      try {
        const result = await definition.execute(input, options)
        store.recordActivity(definition.name, 'success', result, 'webmcp')
        return result
      } catch (error) {
        const status = options.signal.aborted ? 'cancelled' : 'failure'
        store.recordActivity(definition.name, status, summarizeToolError(error), 'webmcp')
        throw error
      }
    },
  }
}
