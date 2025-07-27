import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWsAdapter, wsConnectedEvent, wsDisconnectedEvent, wsErrorEvent } from '.'
import { createContext } from '../../context'
import { defineInvokeEventa } from '../../invoke-shared'

describe.todo('ws-adapter', () => {
  let ws: WebSocket

  beforeEach(() => {
    // Mock WebSocket
    ws = {
      send: vi.fn(),
      close: vi.fn(),
      onmessage: null,
      onopen: null,
      onerror: null,
      onclose: null,
    } as unknown as WebSocket

    (globalThis as any).WebSocket = vi.fn(() => ws)
  })

  it('should create a ws adapter and handle events', () => {
    const wsAdapter = createWsAdapter('ws://localhost:3000')
    const ctx = createContext({ adapter: wsAdapter })

    expect(ctx).toBeDefined()
    expect(globalThis.WebSocket).toHaveBeenCalledWith('ws://localhost:3000')

    // Test sending message
    const testEvent = defineInvokeEventa<string, string>('test')
    ctx.emit(testEvent.sendEvent, 'hello')

    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"payload":"hello"'))

    // Test receiving message
    const onMessage = vi.fn()
    ctx.on(testEvent.receiveEvent, onMessage)

    ws.onmessage?.({
      data: JSON.stringify({
        id: '123',
        type: testEvent.receiveEvent,
        payload: 'world',
        timestamp: Date.now(),
      }),
    } as MessageEvent)

    expect(onMessage).toHaveBeenCalledWith('world')
  })

  it('should handle connection lifecycle events', () => {
    const wsAdapter = createWsAdapter('ws://localhost:3000')
    const ctx = createContext({ adapter: wsAdapter })

    const onConnect = vi.fn()
    const onError = vi.fn()
    const onDisconnect = vi.fn()

    ctx.on(wsConnectedEvent.sendEvent, onConnect)
    ctx.on(wsErrorEvent.sendEvent, onError)
    ctx.on(wsDisconnectedEvent.sendEvent, onDisconnect)

    ws.onopen?.({} as Event)
    expect(onConnect).toHaveBeenCalledWith({ url: 'ws://localhost:3000' })

    const error = new Error('test error')
    ws.onerror?.(error as unknown as Event)
    expect(onError).toHaveBeenCalledWith({ error })

    ws.onclose?.({} as CloseEvent)
    expect(onDisconnect).toHaveBeenCalledWith({ url: 'ws://localhost:3000' })
  })
})
