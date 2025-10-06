import type { BrowserWindow, IpcMain } from 'electron'

import type { DirectionalEventa, Eventa } from '../../eventa'

import { createContext as createBaseContext } from '../../context'
import { and, defineInboundEventa, defineOutboundEventa, EventaFlowDirection, matchBy } from '../../eventa'
import { generatePayload, parsePayload } from './internal'
import { errorEvent } from './shared'

function withRemoval(ipcMain: IpcMain, type: string, listener: Parameters<IpcMain['on']>[1]) {
  ipcMain.on(type, listener)

  return {
    remove: () => {
      ipcMain.off(type, listener)
    },
  }
}

export function createContext(ipcMain: IpcMain, window: BrowserWindow, options?: {
  messageEventName?: string | false
  errorEventName?: string | false
  extraListeners?: Record<string, (_, event: Event) => void | Promise<void>>
  throwIfFailedToSend?: boolean
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
        window?.webContents?.send(messageEventName, eventBody)
      }
      catch (error) {
        if (!(error instanceof Error) || error?.message !== 'Object has been destroyed') {
          throw error
        }
      }
    }
  })

  if (messageEventName) {
    cleanupRemoval.push(withRemoval(ipcMain, messageEventName, (_, event: Event | unknown) => {
      try {
        const { type, payload } = parsePayload<Eventa<any>>(event)
        ctx.emit(defineInboundEventa(type), payload.body)
      }
      catch (error) {
        console.error('Failed to parse IpcMain message:', error)
        ctx.emit(errorEvent, { error })
      }
    }))
  }

  if (errorEventName) {
    cleanupRemoval.push(withRemoval(ipcMain, errorEventName, (_, error: Event | unknown) => {
      ctx.emit(errorEvent, { error })
    }))
  }

  for (const [eventName, listener] of Object.entries(extraListeners)) {
    cleanupRemoval.push(withRemoval(ipcMain, eventName, listener))
  }

  return {
    context: ctx,
    dispose: () => {
      cleanupRemoval.forEach(removal => removal.remove())
    },
  }
}

export type * from './shared'
