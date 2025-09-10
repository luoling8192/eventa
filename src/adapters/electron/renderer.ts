import type { IpcRenderer, IpcRendererListener } from '@electron-toolkit/preload'

import type { DirectionalEventa, Eventa } from '../../eventa'

import { createContext as createBaseContext } from '../../context'
import { and, defineInboundEventa, defineOutboundEventa, EventaFlowDirection, matchBy } from '../../eventa'
import { generatePayload, parsePayload } from './internal'
import { errorEvent } from './shared'

export function createContext(eventTarget: IpcRenderer, options?: {
  messageEventName?: string | false
  errorEventName?: string | false
  extraListeners?: Record<string, IpcRendererListener>
}) {
  const ctx = createBaseContext()

  const {
    messageEventName = 'message',
    errorEventName = 'error',
    extraListeners = {},
  } = options || {}

  const cleanupRemoval: Array<{ remove: () => void }> = []

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
    matchBy('*'),
  ), (event) => {
    const detail = generatePayload(event.id, { ...defineOutboundEventa(event.type), ...event })
    eventTarget.send(event.id, detail)
  })

  if (messageEventName) {
    eventTarget.on(messageEventName, (_, event) => {
      try {
        const { type, payload } = parsePayload<Eventa<any>>(event)
        ctx.emit(defineInboundEventa(type), payload.body)
      }
      catch (error) {
        console.error('Failed to parse EventEmitter message:', error)
        ctx.emit(errorEvent, { error })
      }
    })
  }

  if (errorEventName) {
    eventTarget.on(errorEventName, (_, error) => {
      ctx.emit(errorEvent, { error })
    })
  }

  for (const [eventName, listener] of Object.entries(extraListeners)) {
    eventTarget.on(eventName, listener)
  }

  return {
    context: ctx,
    dispose: () => {
      cleanupRemoval.forEach(removal => removal.remove())
    },
  }
}

export type * from './shared'
