import type { EventTag } from '../../eventa'

export interface WebsocketPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
  timestamp: number
}
