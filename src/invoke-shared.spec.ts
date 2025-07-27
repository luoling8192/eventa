import { describe, expect, it } from 'vitest'

import { defineInvokeEventa } from './invoke-shared'

describe('eventa', () => {
  it('should create server and client events', () => {
    const events = defineInvokeEventa<{ name: string }, { id: string }>()
    expect(typeof events.sendEvent).toBe('object')
    expect(typeof events.sendEvent.id).toBe('string')
    expect(typeof events.receiveEvent).toBe('object')
    expect(typeof events.receiveEvent.id).toBe('string')
    expect(events.sendEvent).not.toBe(events.receiveEvent)
  })
})
