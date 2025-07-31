import type { Eventa, EventTag } from '../../eventa'

import { defineEventa } from '../../eventa'

export interface WorkerPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
}

export enum BaseWorkerType {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export interface BaseWorkerEventa<P, T = undefined> extends Eventa<P> {
  workerType: BaseWorkerType | T
}

export interface InboundEventa<T> extends BaseWorkerEventa<T> {
  workerType: BaseWorkerType.Inbound
}

export interface OutboundEventa<T> extends BaseWorkerEventa<T> {
  workerType: BaseWorkerType.Outbound
}

export function defineInboundEventa<T>(id?: string): InboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    workerType: BaseWorkerType.Inbound,
  } as InboundEventa<T>
}

export function defineOutboundEventa<T>(id?: string): OutboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    workerType: BaseWorkerType.Outbound,
  } as OutboundEventa<T>
}

export enum WorkerType {
  Error = 'error',
  MessageError = 'messageError',
}

export interface ErrorEvent extends BaseWorkerEventa<{ error: unknown }, WorkerType> {
  workerType: WorkerType.Error
}

export interface MessageErrorEvent extends BaseWorkerEventa<{ error: unknown, message: any }, WorkerType> {
  workerType: WorkerType.MessageError
}

export const workerErrorEvent = { ...defineEventa<{ error: unknown }>(), workerType: WorkerType.Error } as ErrorEvent
export const workerMessageErrorEvent = { ...defineEventa<{ error: unknown, message: any }>(), workerType: WorkerType.MessageError } as MessageErrorEvent

export function isWorkerEvent<P>(event: Eventa<P>): event is BaseWorkerEventa<P, WorkerType> {
  return 'workerType' in event && Object.values(WorkerType).includes(event.workerType as WorkerType)
}

export function isNotWorkerEvent<P>(event: Eventa<P>): event is Eventa<P> {
  return !isWorkerEvent(event)
}
