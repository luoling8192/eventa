import type { Eventa, EventTag } from '../../eventa'

import { defineEventa } from '../../eventa'

export interface CustomEventDetail<T> {
  id: string
  type: EventTag<any, any>
  payload: T
}

export enum BaseCustomEventType {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export interface BaseCustomEventEventa<P, T = undefined> extends Eventa<P> {
  customEventDetailType: BaseCustomEventType | T
}

export interface InboundEventa<T> extends BaseCustomEventEventa<T> {
  customEventDetailType: BaseCustomEventType.Inbound
}

export interface OutboundEventa<T> extends BaseCustomEventEventa<T> {
  customEventDetailType: BaseCustomEventType.Outbound
}

export function defineInboundEventa<T>(id?: string): InboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    customEventDetailType: BaseCustomEventType.Inbound,
  } as InboundEventa<T>
}

export function defineOutboundEventa<T>(id?: string): OutboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    customEventDetailType: BaseCustomEventType.Outbound,
  } as OutboundEventa<T>
}

export enum EventTargetEventType {
  Error = 'error',
  MessageError = 'messageError',
}

export interface ErrorEvent extends BaseCustomEventEventa<{ error: unknown }, EventTargetEventType> {
  customEventDetailType: EventTargetEventType.Error
}

export const workerErrorEvent = { ...defineEventa<{ error: unknown }>(), customEventDetailType: EventTargetEventType.Error } as ErrorEvent

export function isEventTargetEvent<P>(event: Eventa<P>): event is BaseCustomEventEventa<P, EventTargetEventType> {
  return 'customEventDetailType' in event && Object.values(EventTargetEventType).includes(event.customEventDetailType as EventTargetEventType)
}

export function isNotEventTargetEvent<P>(event: Eventa<P>): event is Eventa<P> {
  return !isEventTargetEvent(event)
}
