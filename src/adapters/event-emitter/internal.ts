import type { EventTag } from '../..'
import type { Payload as CustomEventDetailDetail } from './shared'

import { nanoid } from '../..'

export function generatePayload<T>(type: EventTag<any, any>, payload: T): CustomEventDetailDetail<T> {
  return {
    id: nanoid(),
    type,
    payload,
  }
}

export function parsePayload<T>(data: unknown): CustomEventDetailDetail<T> {
  return data as CustomEventDetailDetail<T>
}
