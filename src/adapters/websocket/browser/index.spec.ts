import type { Mock } from 'vitest'

import type { Eventa } from '../../eventa'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWsAdapter, wsConnectedEvent, wsDisconnectedEvent, wsErrorEvent } from '.'
import { createContext } from '../../context'
import { defineEventa } from '../../eventa'

describe('ws-adapter', () => {
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
    const testEvent = defineEventa<string>('test')
    ctx.emit(testEvent, 'hello')

    const send = ws.send as Mock

    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0][0]).toBeTypeOf('string')

    const sentData = JSON.parse(send.mock.calls[0][0])
    expect(sentData.id).toBeTypeOf('string')

    // Test receiving message
    const onMessage = vi.fn()
    ctx.on(testEvent, onMessage)

    ctx.emit(testEvent, 'world')

    expect(onMessage).toHaveBeenCalledOnce()
    expect(onMessage.mock.calls[0][0]).toBeTypeOf('object')

    const receivedData = onMessage.mock.calls[0][0] as Eventa<string>
    expect(receivedData.id).toBe(testEvent.id)
    expect(receivedData.type).toBe(testEvent.type)
    expect(receivedData.body).toBe('world')
  })

  it('should handle connection lifecycle events', () => {
    const wsAdapter = createWsAdapter('ws://localhost:3000')
    const ctx = createContext({ adapter: wsAdapter })

    const onConnect = vi.fn()
    const onError = vi.fn()
    const onDisconnect = vi.fn()

    ctx.on(wsConnectedEvent, onConnect)
    ctx.on(wsErrorEvent, onError)
    ctx.on(wsDisconnectedEvent, onDisconnect)

    // Simulate connection events
    ctx.emit(wsConnectedEvent, undefined)

    expect(onConnect).toHaveBeenCalledOnce()
    expect(onConnect.mock.calls[0][0]).toBeTypeOf('object')

    const connectData = onConnect.mock.calls[0][0] as Eventa<{ id: string }>

    expect(connectData.id).toBeTypeOf('string')
    expect(connectData.body).toBeUndefined()

    const error = new Error('test error')
    ctx.emit(wsErrorEvent, { error })

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeTypeOf('object')

    const errorData = onError.mock.calls[0][0] as Eventa<{ error: unknown }>

    expect(errorData.id).toBe(wsErrorEvent.id)
    expect(errorData.body).toMatchObject({ error })

    ctx.emit(wsDisconnectedEvent, undefined)

    expect(onDisconnect).toHaveBeenCalledOnce()
    expect(onDisconnect.mock.calls[0][0]).toBeTypeOf('object')

    const disconnectData = onDisconnect.mock.calls[0][0] as Eventa<{ id: string }>

    expect(disconnectData.id).toBe(wsDisconnectedEvent.id)
    expect(disconnectData.body).toBeUndefined()
  })
})
