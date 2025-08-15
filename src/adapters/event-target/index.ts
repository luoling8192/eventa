import type { Eventa, DirectionalEventa } from '../../eventa'

import { createContext as createBaseContext } from '../../context'
import { and, EventaType, matchBy, defineInboundEventa, defineOutboundEventa, EventaFlowDirection } from '../../eventa'
import { generateCustomEventDetail, parseCustomEventDetail } from './internal'
import { workerErrorEvent } from './shared'

function withRemoval(eventTarget: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null) {
  eventTarget.addEventListener(type, listener)

  return {
    remove: () => {
      eventTarget.removeEventListener(type, listener)
    },
  }
}

export function createContext(eventTarget: EventTarget, options?: {
  messageEventName?: string | false
  errorEventName?: string | false
  extraListeners?: Record<string, (event: Event) => void | Promise<void>>
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
    const detail = generateCustomEventDetail(event.id, { ...defineOutboundEventa(event.type), ...event })

    const customEvent = new CustomEvent(messageEventName || EventaType.Event, {
      detail,
      bubbles: true,
      cancelable: true,
    })

    eventTarget.dispatchEvent(customEvent)
  })

  if (messageEventName) {
    cleanupRemoval.push(withRemoval(eventTarget, messageEventName, (event) => {
      try {
        const { type, payload } = parseCustomEventDetail<Eventa<any>>((event as CustomEvent).detail)
        ctx.emit(defineInboundEventa(type), payload.body)
      }
      catch (error) {
        console.error('Failed to parse WebSocket message:', error)
        ctx.emit(workerErrorEvent, { error })
      }
    }))
  }

  if (errorEventName) {
    cleanupRemoval.push(withRemoval(eventTarget, errorEventName, (error) => {
      ctx.emit(workerErrorEvent, { error })
    }))
  }

  for (const [eventName, listener] of Object.entries(extraListeners)) {
    cleanupRemoval.push(withRemoval(eventTarget, eventName, listener))
  }

  return {
    context: ctx,
    dispose: () => {
      cleanupRemoval.forEach(removal => removal.remove())
    },
  }
}

export type * from './shared'
