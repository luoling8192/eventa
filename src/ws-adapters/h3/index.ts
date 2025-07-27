import type { App, EventHandler } from 'h3'

import type { EventaAdapter } from '..'
import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'

import { defineWebSocketHandler } from 'h3'

import { generateWebsocketPayload, parseWebsocketPayload } from '..'
import { defineEventa } from '../../eventa'

export const wsConnectedEvent = defineEventa<{ id: string }>()
export const wsDisconnectedEvent = defineEventa<{ id: string }>()
export const wsErrorEvent = defineEventa<{ error: unknown }>()

// H3 does not export the Peer type directly, so we extract it from the `message` hook of the WebSocket event handler.
type Hooks = NonNullable<EventHandler['__websocket__']>
export type Peer = Parameters<NonNullable<Hooks['message']>>[0]

export function createH3WsAdapter(app: App, peers: Set<Peer> = new Set<Peer>()): EventaAdapter {
  return (emit: EventContextEmitFn) => {
    app.use('/ws', defineWebSocketHandler({
      open(peer) {
        peers.add(peer)
        emit(wsConnectedEvent, { id: peer.id })
      },

      close(peer) {
        peers.delete(peer)
        emit(wsDisconnectedEvent, { id: peer.id })
      },

      error(peer, error) {
        emit(wsErrorEvent, { error })
      },

      async message(peer, message) {
        try {
          const { type, payload } = parseWebsocketPayload(message.json())
          emit(type, payload)
        }
        catch (error) {
          emit(wsErrorEvent, { error })
        }
      },
    }))

    return {
      cleanup: () => {
        for (const peer of peers) {
          peer.close()
        }
        peers.clear()
      },

      hooks: {
        // when ctx.on called, call onReceived
        onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          const data = JSON.stringify(generateWebsocketPayload(tag, payload))
          for (const peer of peers) {
            peer.send(data)
          }
        },

        onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          const data = JSON.stringify(generateWebsocketPayload(tag, payload))
          for (const peer of peers) {
            peer.send(data)
          }
        },
      },
    }
  }
}
