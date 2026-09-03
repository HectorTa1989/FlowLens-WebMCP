export type JsonSchema = {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties: false
}

export type WebMCPTool = {
  name: string
  title: string
  description: string
  inputSchema: JsonSchema
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
  execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<string> | string
}

export type RegisteredTool = Omit<WebMCPTool, 'execute'> & { origin?: string }

export type ModelContextLike = {
  registerTool: (tool: WebMCPTool, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<void>
  getTools: (options?: { fromOrigins?: string[] }) => Promise<RegisteredTool[]>
  executeTool: (tool: RegisteredTool, input: string, options?: { signal?: AbortSignal }) => Promise<string | null>
  addEventListener?: (type: 'toolchange', listener: () => void) => void
  removeEventListener?: (type: 'toolchange', listener: () => void) => void
}

declare global {
  interface Document {
    modelContext?: ModelContextLike
  }
}
