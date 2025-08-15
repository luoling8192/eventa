import type { DirectionalEventa, Eventa } from '../../eventa'

import { createContext as createBaseContext } from '../../context'
import { and, matchBy, defineInboundEventa, defineOutboundEventa, EventaFlowDirection } from '../../eventa'
import { generateWorkerPayload, parseWorkerPayload } from './internal'
import { workerErrorEvent } from './shared'

export function createContext(worker: Worker) {
  const ctx = createBaseContext()

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
    matchBy('*'),
  ), (event) => {
    const data = generateWorkerPayload(event.id, { ...defineOutboundEventa(event.type), ...event })
    worker.postMessage(data)
  })

  worker.onmessage = (event) => {
    try {
      const { type, payload } = parseWorkerPayload<Eventa<any>>(event.data)
      ctx.emit(defineInboundEventa(type), payload.body)
    }
    catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      ctx.emit(workerErrorEvent, { error })
    }
  }

  worker.onerror = (error) => {
    ctx.emit(workerErrorEvent, { error })
  }

  worker.onmessageerror = (error) => {
    ctx.emit(workerErrorEvent, { error })
  }

  return {
    context: ctx,
  }
}

export type * from './shared'
