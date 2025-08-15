import type { Eventa, DirectionalEventa } from '../../../eventa'

import { createContext as createBaseContext } from '../../../context'
import { and, defineEventa, matchBy, defineInboundEventa, defineOutboundEventa, EventaFlowDirection } from '../../../eventa'
import { generateWebsocketPayload, parseWebsocketPayload } from '../internal'

export const wsConnectedEvent = defineEventa<{ url: string }>()
export const wsDisconnectedEvent = defineEventa<{ url: string }>()
export const wsErrorEvent = defineEventa<{ error: unknown }>()

export function createContext(wsConn: WebSocket) {
  const ctx = createBaseContext()

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
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
