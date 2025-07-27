import type { EventContextEmitFn } from '../context'
import type { EventTag } from '../eventa'

import { nanoid } from '../eventa'

export interface WebsocketPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
  timestamp: number
}

export function generateWebsocketPayload<T>(type: EventTag<any, any>, payload: T): WebsocketPayload<T> {
  return {
    id: nanoid(),
    type,
    payload,
    timestamp: Date.now(),
  }
}

export function parseWebsocketPayload<T>(data: string): WebsocketPayload<T> {
  return JSON.parse(data) as WebsocketPayload<T>
}

interface EventaAdapterProps {
  cleanup: () => void

  hooks: {
    /**
     * When `ctx.on`, `ctx.once` called, call `onReceived`
     */
    onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => void

    /**
     * When `ctx.emit` called, call `onSent`
     */
    onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => void
  }
}

export type EventaAdapter = (emit: EventContextEmitFn) => EventaAdapterProps
