import { describe, expect, it, vi } from 'vitest'

import { createContext } from './context'
import { defineEventa } from './eventa'

describe('eventContext', () => {
  it('should register and emit events', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')
    const handler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).toHaveBeenCalledWith({ ...testEvent, body: { data: 'test' } })
  })

  it('should handle once listeners', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')
    const handler = vi.fn()

    ctx.once(testEvent, handler)
    ctx.emit(testEvent, { data: 'test1' })
    ctx.emit(testEvent, { data: 'test2' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ ...testEvent, body: { data: 'test1' } })
  })

  it('should remove listeners with off', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')
    const handler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.off(testEvent)
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).not.toHaveBeenCalled()
  })
})
