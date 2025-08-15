import type { EventTag } from '../../eventa'

import { defineEventa } from '../../eventa'

export interface CustomEventDetail<T> {
  id: string
  type: EventTag<any, any>
  payload: T
}

export const workerErrorEvent = { ...defineEventa<{ error: unknown }>() }
