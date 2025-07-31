import type { EventTag } from '../..'
import type { WorkerPayload } from './shared'

import { nanoid } from '../..'

export function generateWorkerPayload<T>(type: EventTag<any, any>, payload: T): WorkerPayload<T> {
  return {
    id: nanoid(),
    type,
    payload,
  }
}

export function parseWorkerPayload<T>(data: unknown): WorkerPayload<T> {
  return data as WorkerPayload<T>
}
