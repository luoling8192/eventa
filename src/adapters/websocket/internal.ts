import type { EventTag } from '../../eventa'
import type { WebsocketPayload } from './shared'

import { nanoid } from '../../eventa'

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
