import type { EventTag } from '../../eventa'

import { defineEventa } from '../../eventa'

export interface WorkerPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
}

export const workerErrorEvent = defineEventa<{ error: unknown }>()
export const workerMessageErrorEvent = defineEventa<{ error: unknown, message: any }>()
