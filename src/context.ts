import type { EventaAdapter } from './context-hooks'
import type { Eventa, EventaMatchExpression, EventTag } from './eventa'

import { EventaType } from './eventa'

interface CreateContextProps<EmitOptions = any> {
  adapter?: EventaAdapter<EmitOptions>
}

export function createContext<Extensions = any, EmitOptions = any>(props: CreateContextProps<EmitOptions> = {}): EventContext<Extensions, EmitOptions> {
  const listeners = new Map<EventTag<any, any>, Set<(params: any, options?: EmitOptions) => any>>()
  const onceListeners = new Map<EventTag<any, any>, Set<(params: any, options?: EmitOptions) => any>>()

  const matchExpressions = new Map<string, EventaMatchExpression<any>>()
  const matchExpressionListeners = new Map<string, Set<(params: any, options?: EmitOptions) => any>>()
  const matchExpressionOnceListeners = new Map<string, Set<(params: any, options?: EmitOptions) => any>>()

  const hooks = props.adapter?.(emit).hooks

  function emit<P>(event: Eventa<P>, payload: P, options?: EmitOptions) {
    const emittingPayload = { ...event, body: payload }

    for (const listener of listeners.get(event.id) || []) {
      listener(emittingPayload, options)
    }

    for (const onceListener of onceListeners.get(event.id) || []) {
      onceListener(emittingPayload, options)
      onceListeners.get(event.id)?.delete(onceListener)
    }

    for (const matchExpression of matchExpressions.values()) {
      if (matchExpression.matcher) {
        const match = matchExpression.matcher(emittingPayload)
        if (!match) {
          continue
        }

        for (const listener of matchExpressionListeners.get(matchExpression.id) || []) {
          listener(emittingPayload, options)
        }
        for (const onceListener of matchExpressionOnceListeners.get(matchExpression.id) || []) {
          onceListener(emittingPayload, options)
          matchExpressionOnceListeners.get(matchExpression.id)?.delete(onceListener)
        }
      }
    }

    hooks?.onSent(event.id, emittingPayload, options)
  }

  return {
    get listeners() {
      return listeners
    },

    get onceListeners() {
      return onceListeners
    },

    emit,

    on<P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>, handler: (payload: Eventa<P>, options?: EmitOptions) => void) {
      if (eventOrMatchExpression.type === EventaType.Event) {
        const event = eventOrMatchExpression as Eventa<P>
        if (!listeners.has(event.id)) {
          listeners.set(event.id, new Set())
        }

        listeners
          .get(event.id)
          ?.add((payload: Eventa<P>, options?: EmitOptions) => {
            handler(payload, options)
            hooks?.onReceived?.(event.id, payload)
          })
      }
      else if (eventOrMatchExpression.type === EventaType.MatchExpression) {
        const matchExpression = eventOrMatchExpression as EventaMatchExpression<P>
        if (!matchExpressions.has(matchExpression.id)) {
          matchExpressions.set(matchExpression.id, matchExpression as EventaMatchExpression<P>)
        }
        if (!matchExpressionListeners.has(matchExpression.id)) {
          matchExpressionListeners.set(matchExpression.id, new Set())
        }

        matchExpressionListeners
          .get(matchExpression.id)
          ?.add((payload: Eventa<P>, options?: EmitOptions) => {
            handler(payload, options)
            hooks?.onReceived?.(matchExpression.id, payload)
          })
      }
    },

    once<P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>, handler: (payload: Eventa<P>, options?: EmitOptions) => void) {
      if (eventOrMatchExpression.type === EventaType.Event) {
        const event = eventOrMatchExpression as Eventa<P>
        if (!onceListeners.has(event.id)) {
          onceListeners.set(event.id, new Set())
        }

        onceListeners
          .get(event.id)
          ?.add((payload: Eventa<P>, options?: EmitOptions) => {
            handler(payload, options)
            hooks?.onReceived?.(event.id, payload)
          })
      }
      else if (eventOrMatchExpression.type === EventaType.MatchExpression) {
        const matchExpression = eventOrMatchExpression as EventaMatchExpression<P>
        if (!matchExpressions.has(matchExpression.id)) {
          matchExpressions.set(matchExpression.id, matchExpression as EventaMatchExpression<P>)
        }
        if (!matchExpressionListeners.has(matchExpression.id)) {
          matchExpressionListeners.set(matchExpression.id, new Set())
        }

        matchExpressionOnceListeners
          .get(matchExpression.id)
          ?.add((payload: Eventa<P>, options?: EmitOptions) => {
            handler(payload, options)
            hooks?.onReceived?.(matchExpression.id, payload)
          })
      }
    },

    off<P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>) {
      if (eventOrMatchExpression.type === EventaType.Event) {
        listeners.delete(eventOrMatchExpression.id)
        onceListeners.delete(eventOrMatchExpression.id)
      }
      if (eventOrMatchExpression.type === EventaType.MatchExpression) {
        matchExpressionListeners.delete(eventOrMatchExpression.id)
        matchExpressionOnceListeners.delete(eventOrMatchExpression.id)
      }
    },
  }
}

export interface EventContext<Extensions = any, EmitOptions = undefined> {
  listeners: Map<EventTag<any, any>, Set<(params: any) => any>>
  onceListeners: Map<EventTag<any, any>, Set<(params: any) => any>>

  emit: <P>(event: Eventa<P>, payload: P, options?: EmitOptions) => void
  on: <P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>, handler: (payload: Eventa<P>, options?: EmitOptions) => void) => void
  once: <P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>, handler: (payload: Eventa<P>, options?: EmitOptions) => void) => void
  off: <P>(eventOrMatchExpression: Eventa<P> | EventaMatchExpression<P>) => void

  /**
   * Extensions
   */
  extensions?: Extensions
}

export type EventContextEmitFn = EventContext['emit']
