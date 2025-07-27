import { describe, expect, it } from 'vitest'

import { createContext } from './context'
import { defineInvoke, defineInvokeHandler } from './invoke'
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

  // it.skip('should handle multiple concurrent invokes', async () => {
  //   const serverCtx = createContext()
  //   const clientCtx = createContext()
  //   const events = defineEventa<{ value: number }, { result: number }>()

  //   defineInvokeHandler(serverCtx, events, ({ value }) => ({
  //     result: value * 2,
  //   }))

  //   const invoke = defineInvoke(clientCtx, events)

  //   const promise1 = invoke({ value: 10 })
  //   const promise2 = invoke({ value: 20 })

  //   setTimeout(() => {
  //     serverCtx.emit(events.outboundEvent, { result: 20 })
  //     serverCtx.emit(events.outboundEvent, { result: 40 })
  //   }, 0.1)

  //   const [result1, result2] = await Promise.all([promise1, promise2])
  //   expect(result1).toEqual({ result: 20 })
  //   expect(result2).toEqual({ result: 40 })
  // })
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
