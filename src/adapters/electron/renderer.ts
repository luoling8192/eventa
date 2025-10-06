import type { IpcRenderer, IpcRendererListener } from '@electron-toolkit/preload'

import type { DirectionalEventa, Eventa } from '../../eventa'

import { createContext as createBaseContext } from '../../context'
import { and, defineInboundEventa, defineOutboundEventa, EventaFlowDirection, matchBy } from '../../eventa'
import { generatePayload, parsePayload } from './internal'
import { errorEvent } from './shared'

export function createContext(ipcRenderer: IpcRenderer, options?: {
  messageEventName?: string | false
  errorEventName?: string | false
  extraListeners?: Record<string, IpcRendererListener>
}) {
  const ctx = createBaseContext()

  const {
    messageEventName = 'eventa-message',
    errorEventName = 'eventa-error',
    extraListeners = {},
  } = options || {}

  const cleanupRemoval: Array<{ remove: () => void }> = []

  ctx.on(and(
    matchBy((e: DirectionalEventa<any>) => e._flowDirection === EventaFlowDirection.Outbound || !e._flowDirection),
    matchBy('*'),
  ), (event) => {
    const eventBody = generatePayload(event.id, { ...defineOutboundEventa(event.type), ...event })
    if (messageEventName !== false) {
      try {
        ipcRenderer.send(messageEventName, eventBody)
      }
      catch (error) {
        if (!(error instanceof Error) || error?.message !== 'Object has been destroyed') {
          throw error
        }
      }
    }
  })

  if (messageEventName) {
    ipcRenderer.on(messageEventName, (_, event) => {
      try {
        const { type, payload } = parsePayload<Eventa<any>>(event)
        ctx.emit(defineInboundEventa(type), payload.body)
      }
      catch (error) {
        console.error('Failed to parse IpcRenderer message:', error)
        ctx.emit(errorEvent, { error })
      }
    })
  }

  if (errorEventName) {
    ipcRenderer.on(errorEventName, (_, error) => {
      ctx.emit(errorEvent, { error })
    })
  }

  for (const [eventName, listener] of Object.entries(extraListeners)) {
    ipcRenderer.on(eventName, listener)
  }

  return {
    context: ctx,
    dispose: () => {
      cleanupRemoval.forEach(removal => removal.remove())
    },
  }
}

export type * from './shared'
