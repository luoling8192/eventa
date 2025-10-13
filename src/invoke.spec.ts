import { describe, expect, it, vi } from 'vitest'

import { createContext } from './context'
import { defineInvoke, defineInvokeHandler, undefineInvokeHandler } from './invoke'
import { defineInvokeEventa } from './invoke-shared'

describe('invoke', () => {
  it('should handle request-response pattern', async () => {
    const ctx = createContext()
    const events = defineInvokeEventa<{ id: string }, { name: string, age: number }>()

    defineInvokeHandler(ctx, events, ({ name, age }) => ({
      id: `${name}-${age}`,
    }))

    const invoke = defineInvoke(ctx, events)

    const result = await invoke({ name: 'alice', age: 25 })
    expect(result).toEqual({ id: 'alice-25' })
  })

  it('should handle request-response pattern with error', async () => {
    const ctx = createContext()
    const events = defineInvokeEventa<{ id: string }, { name: string, age: number }>()

    defineInvokeHandler(ctx, events, ({ name, age }) => {
      throw new Error(`Error processing request for ${name} aged ${age}`)
    })

    const invoke = defineInvoke(ctx, events)

    await expect(() => invoke({ name: 'alice', age: 25 }))
      .rejects
      .toThrowError('Error processing request for alice aged 25')
  })

  it('should handle multiple concurrent invokes', async () => {
    const ctx = createContext()

    const events = defineInvokeEventa<{ result: number }, { value: number }>()
    defineInvokeHandler(ctx, events, ({ value }) => ({ result: value * 2 }))
    const invoke = defineInvoke(ctx, events)

    const promise1 = invoke({ value: 10 })
    const promise2 = invoke({ value: 20 })
    const promise3 = invoke({ value: 50 })

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3])
    expect(result1).toEqual({ result: 20 })
    expect(result2).toEqual({ result: 40 })
    expect(result3).toEqual({ result: 100 })
  })

  it('should register the same handler only once', () => {
    const ctx = createContext()
    const events = defineInvokeEventa<void, void>()

    const handler = vi.fn()

    defineInvokeHandler(ctx, events, handler)
    defineInvokeHandler(ctx, events, handler)

    const invoke = defineInvoke(ctx, events)

    invoke()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should remove specific invoke handler via off', () => {
    const ctx = createContext()
    const events = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, events, handler)
    const weakOff = defineInvokeHandler(ctx, events, weakHandler)

    const invoke = defineInvoke(ctx, events)

    invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    weakOff()
    invoke()
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should remove invoke specific handler via undefineInvokeHandler', () => {
    const ctx = createContext()
    const events = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, events, handler)
    defineInvokeHandler(ctx, events, weakHandler)

    const invoke = defineInvoke(ctx, events)

    invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    undefineInvokeHandler(ctx, events, weakHandler)
    invoke()
    expect(handler).toHaveBeenCalledTimes(2)
    expect(weakHandler).toHaveBeenCalledTimes(1)
  })

  it('should remove invoke handlers via undefineInvokeHandler', () => {
    const ctx = createContext()
    const events = defineInvokeEventa<void, void>()

    const handler = vi.fn()
    const weakHandler = vi.fn()

    defineInvokeHandler(ctx, events, handler)
    defineInvokeHandler(ctx, events, weakHandler)

    const invoke = defineInvoke(ctx, events)

    invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)

    undefineInvokeHandler(ctx, events)
    invoke()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(weakHandler).toHaveBeenCalledTimes(1)
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
