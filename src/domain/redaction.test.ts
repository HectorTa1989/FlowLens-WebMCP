import { describe, expect, it } from 'vitest'
import { compact, redact } from './redaction'

describe('untrusted data redaction', () => {
  it('redacts secret-like keys recursively', () => {
    expect(redact({ authorization: 'Bearer secret', nested: { api_key: '123', safe: 'visible' } })).toEqual({ authorization: '[redacted]', nested: { api_key: '[redacted]', safe: 'visible' } })
  })

  it('bounds long text and summaries', () => {
    const value = { note: 'x'.repeat(500) }
    expect((redact(value) as { note: string }).note).toHaveLength(240)
    expect(compact(value, 50).length).toBeLessThanOrEqual(51)
  })
})
