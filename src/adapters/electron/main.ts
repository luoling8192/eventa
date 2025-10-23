import type { BrowserWindow, IpcMain, IpcMainEvent } from 'electron'

import type { EventContext } from '../../context'
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
  const ctx = createBaseContext() as EventContext<any, { raw: { ipcMainEvent: IpcMainEvent, event: Event | unknown } }>

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
        if (window.isDestroyed()) {
          return
        }

        window?.webContents?.send(messageEventName, eventBody)
      }
      catch (error) {
        // Electron may throw if the window is closed before sending
        if (!(error instanceof Error) || error?.message !== 'Object has been destroyed') {
          throw error
        }
      }
    }
  })

  if (messageEventName) {
    cleanupRemoval.push(withRemoval(ipcMain, messageEventName, (ipcMainEvent, event: Event | unknown) => {
      try {
        const { type, payload } = parsePayload<Eventa<any>>(event)
        ctx.emit(defineInboundEventa(type), payload.body, { raw: { ipcMainEvent, event } })
      }
      catch (error) {
        console.error('Failed to parse IpcMain message:', error)
        ctx.emit(errorEvent, { error }, { raw: { ipcMainEvent, event } })
      }
    }))
  }

  if (errorEventName) {
    cleanupRemoval.push(withRemoval(ipcMain, errorEventName, (ipcMainEvent, error: Event | unknown) => {
      ctx.emit(errorEvent, { error }, { raw: { ipcMainEvent, event: error } })
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
