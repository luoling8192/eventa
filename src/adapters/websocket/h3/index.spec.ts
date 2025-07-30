import type { Hooks } from 'crossws'

import type { Eventa } from '../../../eventa'

import { plugin as ws } from 'crossws/server'
import { defineWebSocketHandler, H3, serve } from 'h3'
import { describe, expect, it, vi } from 'vitest'

import { createContext, wsConnectedEvent, wsDisconnectedEvent, wsErrorEvent } from '.'
import { defineEventa, nanoid } from '../../../eventa'
import { createUntil, randomBetween } from '../../../utils'

describe('h3 websocket adapter', { timeout: 2000 }, async () => {
  it('should create a h3 ws adapter and handle events with native', async (testCtx) => {
    const port = randomBetween(40000, 50000)
    const { websocketHandlers, context: ctx } = createContext()
    const app = new H3()
    app.get('/ws', defineWebSocketHandler(websocketHandlers))

    {
      const server = serve(app, {
        port,
        plugins: [ws({
          resolve: async (req) => {
            const response = (await app.fetch(req)) as Response & { crossws: Partial<Hooks> }
            return response.crossws
          },
        })],
      })
      testCtx.onTestFinished(() => {
        server.close()
      })
    }

    const opened = createUntil<void>()
    const wsConn = new WebSocket(`ws://localhost:${port}/ws`)
    wsConn.onopen = () => opened.handler()
    await opened.promise
    expect(wsConn.readyState).toBe(WebSocket.OPEN)

    const helloEvent = defineEventa<{ result: string }>('hello')

    const untilHelloEventTriggered1 = createUntil<void>()
    const handleHello = vi.fn()

    ctx.on(helloEvent, (payload) => {
      handleHello(payload)
      untilHelloEventTriggered1.handler()
    })

    // Native send
    wsConn.send(JSON.stringify({
      id: nanoid(),
      type: helloEvent.id,
      payload: {
        id: helloEvent.id,
        type: helloEvent.type,
        body: { result: 'Hello' },
      } satisfies Eventa<{ result: string }>,
      timestamp: Date.now(),
    }))
    // Context passive send
    ctx.emit(helloEvent, { result: 'Hello' })

    await untilHelloEventTriggered1.promise
    wsConn.close()

    expect(handleHello).toBeCalledTimes(1)
    expect(handleHello.mock.calls[0][0]).toEqual({ id: helloEvent.id, type: helloEvent.type, body: { result: 'Hello' } })
  })

  it('should create a h3 ws adapter and handle events with context', async (testCtx) => {
    const port = randomBetween(40000, 50000)
    const { websocketHandlers, context: ctx } = createContext()
    const app = new H3()
    app.get('/ws', defineWebSocketHandler(websocketHandlers))

    {
      const server = serve(app, {
        port,
        plugins: [ws({
          resolve: async (req) => {
            const response = (await app.fetch(req)) as Response & { crossws: Partial<Hooks> }
            return response.crossws
          },
        })],
      })
      testCtx.onTestFinished(() => {
        server.close()
      })
    }

    const opened = createUntil<void>()
    const wsConn = new WebSocket(`ws://localhost:${port}/ws`)
    wsConn.onopen = () => opened.handler()
    await opened.promise
    expect(wsConn.readyState).toBe(WebSocket.OPEN)

    const helloEvent = defineEventa<{ result: string }>('hello')

    const untilHelloEventTriggered1 = createUntil<void>()
    const handleHello = vi.fn()

    ctx.on(helloEvent, (payload) => {
      handleHello(payload)
      untilHelloEventTriggered1.handler()
    })

    // Context passive send
    ctx.emit(helloEvent, { result: 'Hello' })

    await untilHelloEventTriggered1.promise
    wsConn.close()

    expect(handleHello).toBeCalledTimes(1)
    expect(handleHello.mock.calls[0][0]).toEqual({ id: helloEvent.id, type: helloEvent.type, body: { result: 'Hello' } })
  })

  it('should handle connection lifecycle events', async (testCtx) => {
    const port = randomBetween(40000, 50000)
    const { websocketHandlers, context: ctx } = createContext()
    const app = new H3()
    app.get('/ws', defineWebSocketHandler(websocketHandlers))

    {
      const server = serve(app, {
        port,
        plugins: [ws({
          resolve: async (req) => {
            const response = (await app.fetch(req)) as Response & { crossws: Partial<Hooks> }
            return response.crossws
          },
        })],
      })
      testCtx.onTestFinished(() => {
        server.close()
      })
    }

    const onConnect = vi.fn()
    const onError = vi.fn()
    const onDisconnect = vi.fn()

    const untilDisconnected = createUntil<void>()

    ctx.on(wsConnectedEvent, onConnect)
    ctx.on(wsErrorEvent, onError)
    ctx.on(wsDisconnectedEvent, (payload) => {
      onDisconnect(payload)
      untilDisconnected.handler()
    })

    const opened = createUntil<void>()
    const wsConn = new WebSocket(`ws://localhost:${port}/ws`)
    wsConn.onopen = () => opened.handler()
    await opened.promise
    expect(wsConn.readyState).toBe(WebSocket.OPEN)

    expect(onConnect).toHaveBeenCalledOnce()
    expect(onConnect.mock.calls[0][0]).toBeTypeOf('object')

    const connectData = onConnect.mock.calls[0][0] as Eventa<{ id: string }>

    expect(connectData.id).toBeTypeOf('string')
    expect(connectData.body).toBeTypeOf('object')
    expect(connectData.body?.id).not.equal('')

    const error = new Error('test error')
    ctx.emit(wsErrorEvent, { error })

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeTypeOf('object')

    const errorData = onError.mock.calls[0][0] as Eventa<{ error: unknown }>

    expect(errorData.id).toBe(wsErrorEvent.id)
    expect(errorData.body).toMatchObject({ error })

    wsConn.close()
    await untilDisconnected.promise

    expect(onDisconnect).toHaveBeenCalledOnce()
    expect(onDisconnect.mock.calls[0][0]).toBeTypeOf('object')

    const disconnectData = onDisconnect.mock.calls[0][0] as Eventa<{ id: string }>

    expect(disconnectData.id).toBe(wsDisconnectedEvent.id)
    expect(disconnectData.body).toBeTypeOf('object')
    expect(disconnectData.body?.id).toBe(connectData.body?.id)
  })
})
