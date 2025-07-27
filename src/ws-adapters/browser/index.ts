import type { EventaAdapter } from '..'
import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'

import { generateWebsocketPayload, parseWebsocketPayload } from '..'
import { defineEventa } from '../../eventa'

export const wsConnectedEvent = defineEventa<{ url: string }>()
export const wsDisconnectedEvent = defineEventa<{ url: string }>()
export const wsErrorEvent = defineEventa<{ error: unknown }>()

export function createWsAdapter(url: string): EventaAdapter {
  return (emit: EventContextEmitFn) => {
    const ws = new WebSocket(url)

    ws.onmessage = ({ data }) => {
      const { type, payload } = parseWebsocketPayload(data)
      emit(type, payload)
    }

    ws.onopen = () => {
      emit(wsConnectedEvent.sendEvent, { url })
    }

    ws.onerror = (error) => {
      emit(wsErrorEvent.sendEvent, { error })
    }

    ws.onclose = () => {
      emit(wsDisconnectedEvent.sendEvent, { url })
    }

    return {
      cleanup: () => ws.close(),

      hooks: {
        onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          ws.send(JSON.stringify(generateWebsocketPayload(tag, payload)))
        },

        onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          ws.send(JSON.stringify(generateWebsocketPayload(tag, payload)))
        },
      },
    }
  }
}
