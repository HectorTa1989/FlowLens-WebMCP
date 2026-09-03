const secretPattern = /(secret|token|password|cookie|authorization|api[_-]?key)/i

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[bounded]'
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([key, item]) => [key, secretPattern.test(key) ? '[redacted]' : redact(item, depth + 1)]))
  }
  if (typeof value === 'string') return value.slice(0, 240)
  return value
}

export function compact(value: unknown, limit = 220) {
  const text = JSON.stringify(redact(value))
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}
