import type { EventaAdapter } from './adapters/websocket'
import type { Eventa, EventaLike, EventaMatchExpression, EventTag } from './eventa'

import { EventaType } from './eventa'

interface CreateContextProps {
  adapter?: EventaAdapter

  // hooks?: {
  //   onReceived?: (event: Event<any, any>) => void
  // }
}

export function createContext(props: CreateContextProps = {}) {
  const listeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()
  const onceListeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()

  const matchExpressions = new Map<string, EventaMatchExpression<any>>()
  const matchExpressionListeners = new Map<string, Set<(params: any) => any>>()
  const matchExpressionOnceListeners = new Map<string, Set<(params: any) => any>>()

  const hooks = props.adapter?.(emit).hooks

  function emit<P>(event: Eventa<P>, payload: P) {
    for (const listener of listeners.get(event.id) || []) {
      listener({ ...event, body: payload })
    }

    for (const onceListener of onceListeners.get(event.id) || []) {
      onceListener({ ...event, body: payload })
      onceListeners.get(event.id)?.delete(onceListener)
    }

    for (const matchExpression of matchExpressions.values()) {
      if (matchExpression.matcher) {
        const match = matchExpression.matcher({ ...event, body: payload })
        if (!match) {
          continue
        }

        for (const listener of matchExpressionListeners.get(matchExpression.id) || []) {
          listener({ ...event, body: payload })
        }
        for (const onceListener of matchExpressionOnceListeners.get(matchExpression.id) || []) {
          onceListener({ ...event, body: payload })
          matchExpressionOnceListeners.get(matchExpression.id)?.delete(onceListener)
        }
      }
    }

    hooks?.onSent(event.id, { ...event, body: payload })
  }

  return {
    get listeners() {
      return listeners
    },

    get onceListeners() {
      return onceListeners
    },

    emit,

    on<P>(eventOrMatchExpression: EventaLike<P>, handler: (payload: Eventa<P>) => void) {
      if (eventOrMatchExpression.type === EventaType.Event) {
        const event = eventOrMatchExpression as Eventa<P>
        if (!listeners.has(event.id)) {
          listeners.set(event.id, new Set())
        }

        listeners
          .get(event.id)
          ?.add((payload: Eventa<P>) => {
            handler(payload)
            hooks?.onReceived?.(event.id, payload)
          })
      }
      if (eventOrMatchExpression.type === EventaType.MatchExpression) {
        const matchExpression = eventOrMatchExpression as EventaMatchExpression<P>
        if (!matchExpressions.has(matchExpression.id)) {
          matchExpressions.set(matchExpression.id, matchExpression as EventaMatchExpression<P>)
        }
        if (!matchExpressionListeners.has(matchExpression.id)) {
          matchExpressionListeners.set(matchExpression.id, new Set())
        }

        matchExpressionListeners
          .get(matchExpression.id)
          ?.add((payload: Eventa<P>) => {
            handler(payload)
            hooks?.onReceived?.(matchExpression.id, payload)
          })
      }
    },

    once<P>(eventOrMatchExpression: EventaLike<P>, handler: (payload: Eventa<P>) => void) {
      if (eventOrMatchExpression.type === EventaType.Event) {
        const event = eventOrMatchExpression as Eventa<P>
        if (!onceListeners.has(event.id)) {
          onceListeners.set(event.id, new Set())
        }

        onceListeners
          .get(event.id)
          ?.add((payload: Eventa<P>) => {
            handler(payload)
            hooks?.onReceived?.(event.id, payload)
          })
      }
      if (eventOrMatchExpression.type === EventaType.MatchExpression) {
        const matchExpression = eventOrMatchExpression as EventaMatchExpression<P>
        if (!matchExpressions.has(matchExpression.id)) {
          matchExpressions.set(matchExpression.id, matchExpression as EventaMatchExpression<P>)
        }
        if (!matchExpressionListeners.has(matchExpression.id)) {
          matchExpressionListeners.set(matchExpression.id, new Set())
        }

        matchExpressionOnceListeners
          .get(matchExpression.id)
          ?.add((payload: Eventa<P>) => {
            handler(payload)
            hooks?.onReceived?.(matchExpression.id, payload)
          })
      }
    },

    off<P>(eventOrMatchExpression: EventaLike<P>) {
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

export type EventContext = ReturnType<typeof createContext>
export type EventContextEmitFn = EventContext['emit']
