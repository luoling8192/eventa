/* eslint-disable no-restricted-globals */
import type { Eventa } from '../../../eventa'
import type { BaseWorkerEventa } from '../shared'

import { createContext as createBaseContext } from '../../../context'
import { and, matchBy } from '../../../eventa'
import { generateWorkerPayload, parseWorkerPayload } from '../internal'
import { BaseWorkerType, defineInboundEventa, defineOutboundEventa, isNotWorkerEvent, workerErrorEvent } from '../shared'

export function createContext(): {
  context: ReturnType<typeof createBaseContext>
} {
  const ctx = createBaseContext()

  ctx.on(and(
    matchBy(isNotWorkerEvent),
    matchBy((e: BaseWorkerEventa<any>) => e.workerType === BaseWorkerType.Outbound || !e.workerType),
    matchBy('*'),
  ), (event) => {
    const data = generateWorkerPayload(event.id, { ...defineOutboundEventa(event.type), ...event })
    self.postMessage(data)
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
