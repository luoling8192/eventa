import type { Hooks } from 'crossws'
import type { defineWebSocketHandler } from 'h3'

import type { Eventa, DirectionalEventa } from '../../../eventa'

import { createContext as createBaseContext } from '../../../context'
import { and, defineEventa, matchBy, defineInboundEventa, defineOutboundEventa, EventaFlowDirection } from '../../../eventa'
import { generateWebsocketPayload, parseWebsocketPayload } from '../internal'

export const wsConnectedEvent = defineEventa<{ id: string }>()
export const wsDisconnectedEvent = defineEventa<{ id: string }>()
export const wsErrorEvent = defineEventa<{ error: unknown }>()

export type Peer = Parameters<NonNullable<Hooks['message']>>[0]

export function createContext(): {
  websocketHandlers: Parameters<typeof defineWebSocketHandler>[0]
  context: ReturnType<typeof createBaseContext>
} {
  const ctx = createBaseContext()
  const peers = new Set<Peer>()

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
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
