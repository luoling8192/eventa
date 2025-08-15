/// <reference types="vitest" />
/// <reference types="vite/client" />

import type { Eventa } from '../../eventa'

import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { createContext } from '.'
import { defineEventa, defineInboundEventa } from '../../eventa'
import { defineInvoke, defineInvokeHandler } from '../../invoke'
import { defineInvokeEventa } from '../../invoke-shared'
import { createUntilTriggeredOnce } from '../../utils'

describe('event target', async () => {
  it('context should be able to on and emit events', async () => {
    const eventTarget = new EventEmitter()

    const eventa = defineEventa<{ message: string }>()
    const { context: ctx } = createContext(eventTarget)
    const { onceTriggered, wrapper } = createUntilTriggeredOnce<Eventa, Eventa>(event => event)

    ctx.on(eventa, wrapper)
    ctx.emit(defineInboundEventa(eventa.id), { message: 'Hello, Event Target!' }) // emit: event_trigger
    const event = await onceTriggered
    expect(event.body).toEqual({ message: 'Hello, Event Target!' })
  })

  it('should be able to invoke', async () => {
    const eventTarget = new EventEmitter()

    const { context: ctx } = createContext(eventTarget)

    const events = defineInvokeEventa<Promise<{ output: string }>, { input: number }>()
    const input = defineInvoke(ctx, events)

    defineInvokeHandler(ctx, events, async (payload) => {
      return { output: String(payload.input) }
    })

    const res = await input({ input: 100 })
    expect(res.output).toEqual('100')
  })
})
