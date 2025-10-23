import type { Hooks, Message } from 'crossws'

import { plugin as ws } from 'crossws/server'
import { defineWebSocketHandler, H3, serve } from 'h3'
import { describe, expect, it, vi } from 'vitest'

import { defineEventa, defineInvoke, defineInvokeEventa, defineInvokeHandler } from '../../../'
import { createUntil, randomBetween } from '../../../utils'
import { createContext } from '../native'
import { createPeerHooks } from './peer'

describe('h3 websocket adapter', { timeout: 2000 }, async () => {
  it('should create a h3 ws adapter and handle events with native', async (testCtx) => {
    const port = randomBetween(40000, 50000)
    const app = new H3()

    const { untilLeastOneConnected, hooks } = createPeerHooks()
    app.get('/ws', defineWebSocketHandler(hooks))

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

    const { context: clientConnContext } = createContext(wsConn)
    const { context: serverPeerContext } = await untilLeastOneConnected

    // Hello
    {
      const helloEvent = defineEventa<{ result: string }>('hello')

      const untilHelloEventTriggered1 = createUntil<void>()
      const handleHello = vi.fn()

      serverPeerContext.on(helloEvent, (payload, options) => {
        handleHello(payload, options)
        untilHelloEventTriggered1.handler()
      })

      clientConnContext.emit(helloEvent, { result: 'Hello' }, { raw: { message: {} as Message } })
      await untilHelloEventTriggered1.promise

      expect(handleHello).toBeCalledTimes(1)
      expect(handleHello.mock.calls[0][0].type).toEqual(helloEvent.type)
      expect(handleHello.mock.calls[0][0].body).toEqual({ result: 'Hello' })
      expect(handleHello.mock.calls[0][1]).toBeTypeOf('object')
      expect(handleHello.mock.calls[0][1].raw).toBeTypeOf('object')
      expect(handleHello.mock.calls[0][1].raw).toHaveProperty('message')
    }

    {
      const pingEvent = defineEventa('ping')
      const pongEvent = defineEventa('pong')

      const untilPingEventTriggered1 = createUntil<void>()
      const handlePing = vi.fn()
      const untilPongEventTriggered1 = createUntil<void>()
      const handlePong = vi.fn()

      serverPeerContext.on(pingEvent, () => {
        handlePing()
        untilPingEventTriggered1.handler()
        serverPeerContext.emit(pongEvent, undefined)
      })

      clientConnContext.on(pongEvent, () => {
        handlePong()
        untilPongEventTriggered1.handler()
      })

      clientConnContext.emit(pingEvent, undefined)
      await untilPingEventTriggered1.promise
      await untilPongEventTriggered1.promise

      expect(handlePing).toBeCalledTimes(1)
      expect(handlePong).toBeCalledTimes(1)
    }

    wsConn.close()
  })

  it('should be able to invoke', async (testCtx) => {
    const port = randomBetween(40000, 50000)
    const app = new H3()

    const { untilLeastOneConnected, hooks } = createPeerHooks()
    app.get('/ws', defineWebSocketHandler(hooks))

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

    const { context: clientConnContext } = createContext(wsConn)
    const { context: serverPeerContext } = await untilLeastOneConnected

    // Client invoke to server
    {
      const events = defineInvokeEventa<Promise<{ output: string }>, { input: number }>()
      const input = defineInvoke(clientConnContext, events)

      defineInvokeHandler(serverPeerContext, events, async (payload) => {
        return { output: String(payload.input) }
      })

      const res = await input({ input: 100 })
      expect(res.output).toEqual('100')
    }

    // Server invoke to client
    {
      const events = defineInvokeEventa<Promise<{ output: string }>, { input: number }>()
      const input = defineInvoke(serverPeerContext, events)

      defineInvokeHandler(clientConnContext, events, async (payload) => {
        return { output: String(payload.input) }
      })

      const res = await input({ input: 500 })
      expect(res.output).toEqual('500')
    }
  })
})
