import type { Eventa } from '../../../eventa'
import type { BaseWebSocketEventa } from '../shared'

import { createContext as createBaseContext } from '../../../context'
import { and, defineEventa, matchBy } from '../../../eventa'
import { generateWebsocketPayload, parseWebsocketPayload } from '../internal'
import { BaseWebSocketType, defineInboundEventa, defineOutboundEventa } from '../shared'

export enum WebSocketType {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

export interface ConnectedEvent extends BaseWebSocketEventa<{ url: string }, WebSocketType> {
  websocketType: WebSocketType.Connected
}

export interface DisconnectedEvent extends BaseWebSocketEventa<{ url: string }, WebSocketType> {
  websocketType: WebSocketType.Disconnected
}

export interface ErrorEvent extends BaseWebSocketEventa<{ error: unknown }, WebSocketType> {
  websocketType: WebSocketType.Error
}

export const wsConnectedEvent = { ...defineEventa<{ url: string }>(), websocketType: WebSocketType.Connected } as ConnectedEvent
export const wsDisconnectedEvent = { ...defineEventa<{ url: string }>(), websocketType: WebSocketType.Disconnected } as DisconnectedEvent
export const wsErrorEvent = { ...defineEventa<{ error: unknown }>(), websocketType: WebSocketType.Error } as ErrorEvent

function isWebSocketEvent<P>(event: Eventa<P>): event is BaseWebSocketEventa<P, WebSocketType> {
  return 'websocketType' in event && Object.values(WebSocketType).includes(event.websocketType as WebSocketType)
}

function isNotWebSocketEvent<P>(event: Eventa<P>): event is Eventa<P> {
  return !isWebSocketEvent(event)
}

export function createContext(wsConn: WebSocket) {
  const ctx = createBaseContext()

  ctx.on(and(
    matchBy(isNotWebSocketEvent),
    matchBy((e: BaseWebSocketEventa<any>) => e.websocketType === BaseWebSocketType.Outbound || !e.websocketType),
    matchBy('*'),
  ), (event) => {
    const data = JSON.stringify(generateWebsocketPayload(event.id, { ...defineOutboundEventa(event.type), ...event }))
    wsConn.send(data)
  })

  wsConn.onmessage = (event) => {
    try {
      const { type, payload } = parseWebsocketPayload<Eventa<any>>(event.data)
      ctx.emit(defineInboundEventa(type), payload.body)
    }
    catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      ctx.emit(wsErrorEvent, { error })
    }
  }

  wsConn.onopen = () => {
    ctx.emit(wsConnectedEvent, { url: wsConn.url })
  }

  wsConn.onerror = (error) => {
    ctx.emit(wsErrorEvent, { error })
  }

  wsConn.onclose = () => {
    ctx.emit(wsDisconnectedEvent, { url: wsConn.url })
  }

  return {
    context: ctx,
  }
}
