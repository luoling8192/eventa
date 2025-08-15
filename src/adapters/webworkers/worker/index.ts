/* eslint-disable no-restricted-globals */
import type { Eventa, DirectionalEventa } from '../../../eventa'

import { createContext as createBaseContext } from '../../../context'
import { and, matchBy, defineInboundEventa, EventaFlowDirection, defineOutboundEventa } from '../../../eventa'
import { generateWorkerPayload, parseWorkerPayload } from '../internal'
import { workerErrorEvent } from '../shared'

export function createContext(options?: {
  messagePort?: Omit<MessagePort, 'close' | 'start'>
}): {
  context: ReturnType<typeof createBaseContext>
} {
  const {
    messagePort = self
  } = options || {}

  const ctx = createBaseContext()

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
    matchBy('*'),
  ), (event) => {
    const data = generateWorkerPayload(event.id, { ...defineOutboundEventa(event.type), ...event })
    messagePort.postMessage(data)
  })

  self.onerror = (error) => {
    ctx.emit(workerErrorEvent, { error })
  }

  self.onmessage = (event) => {
    try {
      const { type, payload } = parseWorkerPayload<Eventa<any>>(event.data)
      ctx.emit(defineInboundEventa(type), payload.body)
    }
    catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      ctx.emit(workerErrorEvent, { error })
    }
  }

  return {
    context: ctx,
  }
}
