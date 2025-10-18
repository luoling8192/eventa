import { describe, expect, it, vi } from 'vitest'

import { createContext } from './context'
import { defineInvoke, defineInvokeHandler, defineInvokeHandlers, defineInvokes, undefineInvokeHandler } from './invoke'
import { defineInvokeEventa } from './invoke-shared'

describe('invoke', () => {
  it('should reject when no invoke handler is defined', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<void, void>('lonely-event')
    const invoke = defineInvoke(ctx, event)

    await expect(() => invoke()).rejects.toThrowError(`No invoke handler for invoke event 'lonely-event'`)

    const handler = vi.fn()
    defineInvokeHandler(ctx, event, handler)

    await invoke()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle request-response pattern', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<{ id: string }, { name: string, age: number }>()

    defineInvokeHandler(ctx, event, ({ name, age }) => ({
      id: `${name}-${age}`,
    }))

    const invoke = defineInvoke(ctx, event)

    const result = await invoke({ name: 'alice', age: 25 })
    expect(result).toEqual({ id: 'alice-25' })
  })

  it('should handle request-response pattern with error', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<{ id: string }, { name: string, age: number }>()

    defineInvokeHandler(ctx, event, ({ name, age }) => {
      throw new Error(`Error processing request for ${name} aged ${age}`)
    })

    const invoke = defineInvoke(ctx, event)

    await expect(() => invoke({ name: 'alice', age: 25 }))
      .rejects
      .toThrowError('Error processing request for alice aged 25')
  })

  it('should handle multiple concurrent invokes', async () => {
    const ctx = createContext()

    const event = defineInvokeEventa<{ result: number }, { value: number }>()
    defineInvokeHandler(ctx, event, ({ value }) => ({ result: value * 2 }))
    const invoke = defineInvoke(ctx, event)

    const promise1 = invoke({ value: 10 })
    const promise2 = invoke({ value: 20 })
    const promise3 = invoke({ value: 50 })

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3])
    expect(result1).toEqual({ result: 20 })
    expect(result2).toEqual({ result: 40 })
    expect(result3).toEqual({ result: 100 })
  })

  it('should register the same handler only once', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<void, void>()

    const handler = vi.fn()

    defineInvokeHandler(ctx, event, handler)
    defineInvokeHandler(ctx, event, handler)

    const invoke = defineInvoke(ctx, event)

    await invoke()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should remove specific invoke handler via off', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, event, handler)
    const weakOff = defineInvokeHandler(ctx, event, weakHandler)

    const invoke = defineInvoke(ctx, event)

    await invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    weakOff()
    await invoke()
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should remove invoke specific handler via undefineInvokeHandler', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, event, handler)
    defineInvokeHandler(ctx, event, weakHandler)

    const invoke = defineInvoke(ctx, event)

    await invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    undefineInvokeHandler(ctx, event, weakHandler)
    await invoke()
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should remove invoke handlers via undefineInvokeHandler', async () => {
    const ctx = createContext()
    const event = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, event, handler)
    defineInvokeHandler(ctx, event, weakHandler)

    const invoke = defineInvoke(ctx, event)

    await invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    undefineInvokeHandler(ctx, event)
    await expect(() => invoke()).rejects.toThrowError(`No invoke handler for invoke event '${event.tag}'`)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should define invoke handlers in batch', async () => {
    const ctx = createContext()

    const events = {
      double: defineInvokeEventa<number, number>(),
      append: defineInvokeEventa<string, string>(),
    }

    defineInvokeHandlers(ctx, events, {
      double: input => input * 2,
      append: input => `${input}!`,
    })

    const {
      double: invokeDouble,
      append: invokeAppend,
    } = defineInvokes(ctx, events)

    expect(await invokeDouble(5)).toEqual(10)
    expect(await invokeAppend('test')).toEqual('test!')
  })
})

describe('invoke-type-safety', () => {
  it('should maintain type constraints', () => {
    interface UserRequest {
      name: string
      email: string
    }

    interface UserResponse {
      id: string
      created: boolean
    }

    const events = defineInvokeEventa<UserResponse, UserRequest>()
    const serverCtx = createContext()
    const clientCtx = createContext()

    defineInvokeHandler(serverCtx, events, (req: UserRequest): UserResponse => ({
      id: `user-${req.name}`,
      created: true,
    }))

    const invoke = defineInvoke(clientCtx, events)

    expect(typeof invoke).toBe('function')
  })
})
