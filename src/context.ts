import type { Eventa, EventTag } from './eventa'
import type { EventaAdapter } from './ws-adapters'

interface CreateContextProps {
  adapter?: EventaAdapter

  // hooks?: {
  //   onReceived?: (event: Event<any, any>) => void
  // }
}

export function createContext(props: CreateContextProps = {}) {
  const listeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()
  const onceListeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()

  const hooks = props.adapter?.(emit).hooks

  function emit<T, P>(event: Eventa<T, P>, payload: P) {
    for (const listener of listeners.get(event.id) || []) {
      listener({ ...event, body: payload })
    }

    for (const onceListener of onceListeners.get(event.id) || []) {
      onceListener({ ...event, body: payload })
      onceListeners.get(event.id)?.delete(onceListener)
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

    on<T, P>(event: Eventa<T, P>, handler: (payload: Eventa<T, P>) => void) {
      if (!listeners.has(event.id)) {
        listeners.set(event.id, new Set())
      }
      listeners.get(event.id)?.add((payload: Eventa<T, P>) => {
        handler(payload)
        hooks?.onReceived?.(event.id, payload)
      })
    },

    once<T, P>(event: Eventa<T, P>, handler: (payload: Eventa<T, P>) => void) {
      if (!onceListeners.has(event.id)) {
        onceListeners.set(event.id, new Set())
      }

      onceListeners.get(event.id)?.add((payload: Eventa<T, P>) => {
        handler(payload)
        hooks?.onReceived?.(event.id, payload)
      })
    },

    off<T, P>(event: Eventa<T, P>) {
      listeners.delete(event.id)
      onceListeners.delete(event.id)
    },
  }
}

export type EventContext = ReturnType<typeof createContext>
export type EventContextEmitFn = EventContext['emit']
