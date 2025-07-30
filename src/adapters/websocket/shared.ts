import type { Eventa } from '../../eventa'

import { defineEventa } from '../../eventa'

export enum BaseWebSocketType {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export interface BaseWebSocketEventa<P, T = undefined> extends Eventa<P> {
  websocketType: BaseWebSocketType | T
}

export interface InboundEventa<T> extends BaseWebSocketEventa<T> {
  websocketType: BaseWebSocketType.Inbound
}

export interface OutboundEventa<T> extends BaseWebSocketEventa<T> {
  websocketType: BaseWebSocketType.Outbound
}

export function defineInboundEventa<T>(id?: string): InboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    websocketType: BaseWebSocketType.Inbound,
  } as InboundEventa<T>
}

export function defineOutboundEventa<T>(id?: string): OutboundEventa<T> {
  return {
    ...defineEventa<T>(id),
    websocketType: BaseWebSocketType.Outbound,
  } as OutboundEventa<T>
}
