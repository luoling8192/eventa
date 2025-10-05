import type { Eventa, EventTag } from '../../eventa'

import { defineEventa, defineOutboundEventa } from '../../eventa'

export interface WorkerPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
  transfer?: Transferable[]
}

export interface WorkerEventa<T> extends Eventa<{ message: T, transfer?: Transferable[] }> {
  _workerTransfer: true
}

export function defineWorkerEventa<T>(id?: string): WorkerEventa<T> {
  return {
    ...defineEventa<{ message: T, transfer?: Transferable[] }>(id),
    _workerTransfer: true,
  }
}

export function defineOutboundWorkerEventa<T>(id?: string): WorkerEventa<T> {
  return {
    ...defineOutboundEventa<{ message: T, transfer?: Transferable[] }>(id),
    _workerTransfer: true,
  }
}

export function isWorkerEventa(event: Eventa<any>): event is WorkerEventa<any> {
  return typeof event === 'object'
    && '_workerTransfer' in event
    && typeof event._workerTransfer === 'boolean'
    && event._workerTransfer === true
}

export const workerErrorEvent = defineEventa<{ error: unknown }>()
export const workerMessageErrorEvent = defineEventa<{ error: unknown, message: any }>()

export function normalizeOnListenerParameters(event: Eventa<any>, options?: { transfer?: Transferable[] } | unknown) {
  let body: { message: any, transfer?: Transferable[] } | any | undefined = event.body
  let transfer: Transferable[] | undefined

  if (isWorkerEventa(event)) {
    const e = event as WorkerEventa<any>

    transfer = e.body?.transfer
    body = e.body?.message
    delete event.body
  }
  else if (typeof options !== 'undefined' && options != null && typeof options === 'object' && 'transfer' in options) {
    if (Array.isArray(options.transfer)) {
      transfer = options.transfer
    }
  }

  return {
    body,
    transfer,
  }
}
