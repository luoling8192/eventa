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

    expect(handler).toHaveBeenCalledWith({ ...testEvent, body: { data: 'test' } }, undefined)
  })

  it('should register the same handler only once', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')

    const handler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.on(testEvent, handler)
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).toHaveBeenCalledWith({ ...testEvent, body: { data: 'test' } }, undefined)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle once listeners', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')
    const handler = vi.fn()

    ctx.once(testEvent, handler)
    ctx.emit(testEvent, { data: 'test1' })
    ctx.emit(testEvent, { data: 'test2' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ ...testEvent, body: { data: 'test1' } }, undefined)
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

  it('should remove listeners with returned off', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')
    const handler = vi.fn()

    const off = ctx.on(testEvent, handler)
    off()
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should remove specific listener with off', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')

    const handler = vi.fn()
    const weakHandler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.on(testEvent, weakHandler)

    ctx.emit(testEvent, { data: 'test' })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    ctx.off(testEvent, weakHandler)

    ctx.emit(testEvent, { data: 'test' })
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should remove specific listener with returned off', () => {
    const ctx = createContext()
    const testEvent = defineEventa('test-event')

    const handler = vi.fn()
    const weakHandler = vi.fn()

    ctx.on(testEvent, handler)
    const weakOff = ctx.on(testEvent, weakHandler)

    ctx.emit(testEvent, { data: 'test' })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    weakOff()

    ctx.emit(testEvent, { data: 'test' })
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })
})
