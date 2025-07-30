import type { Hooks } from 'crossws'
import type { defineWebSocketHandler } from 'h3'

import type { Eventa } from '../../../eventa'
import type { BaseWebSocketEventa } from '../shared'

import { generateWebsocketPayload, parseWebsocketPayload } from '..'
import { createContext as createBaseContext } from '../../../context'
import { and, defineEventa, matchBy } from '../../../eventa'
import { BaseWebSocketType, defineInboundEventa, defineOutboundEventa } from '../shared'

export enum H3WsEventType {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

export interface H3WsEvent<T> extends Eventa<T> {
  h3wsType: H3WsEventType
}

export interface ConnectedEvent extends H3WsEvent<{ id: string }> {
  h3wsType: H3WsEventType.Connected
}

export interface DisconnectedEvent extends H3WsEvent<{ id: string }> {
  h3wsType: H3WsEventType.Disconnected
}

export interface ErrorEvent extends H3WsEvent<{ error: unknown }> {
  h3wsType: H3WsEventType.Error
}

export const wsConnectedEvent = { ...defineEventa<{ id: string }>(), h3wsType: H3WsEventType.Connected } as ConnectedEvent
export const wsDisconnectedEvent = { ...defineEventa<{ id: string }>(), h3wsType: H3WsEventType.Disconnected } as DisconnectedEvent
export const wsErrorEvent = { ...defineEventa<{ error: unknown }>(), h3wsType: H3WsEventType.Error } as ErrorEvent

function isH3WsEventa<P>(event: Eventa<P>): event is H3WsEvent<P> {
  return 'h3wsType' in event && Object.values(H3WsEventType).includes(event.h3wsType as H3WsEventType)
}

function isNotH3WsEventa<P>(event: Eventa<P>): event is Eventa<P> {
  return !isH3WsEventa(event)
}
export type Peer = Parameters<NonNullable<Hooks['message']>>[0]

export function createContext(): {
  websocketHandlers: Parameters<typeof defineWebSocketHandler>[0]
  context: ReturnType<typeof createBaseContext>
} {
  const ctx = createBaseContext()
  const peers = new Set<Peer>()

  ctx.on(and(
    matchBy(isNotH3WsEventa),
    matchBy((e: BaseWebSocketEventa<any>) => e.websocketType === BaseWebSocketType.Outbound || !e.websocketType),
    matchBy('*'),
  ), (event) => {
    const data = JSON.stringify(generateWebsocketPayload(event.id, { ...defineOutboundEventa(event.type), ...event }))
    for (const peer of peers) {
      peer.send(data)
    }
  })

  return {
    websocketHandlers: {
      open(peer) {
        peers.add(peer)
        ctx.emit(wsConnectedEvent, { id: peer.id })
      },

      close(peer) {
        peers.delete(peer)
        ctx.emit(wsDisconnectedEvent, { id: peer.id })
      },

      error(_, error) {
        console.error('WebSocket error:', error)
        ctx.emit(wsErrorEvent, { error })
      },

      async message(_, message) {
        try {
          const { type, payload } = parseWebsocketPayload<Eventa<any>>(message.text())
          ctx.emit(defineInboundEventa(type), payload.body)
        }
        catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          ctx.emit(wsErrorEvent, { error })
        }
      },
    },
    context: ctx,
  }
}
