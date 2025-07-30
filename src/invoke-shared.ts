import type { Eventa, EventTag } from './eventa'

import { defineEventa, nanoid } from './eventa'

export enum InvokeEventType {
  SendEvent,
  SendEventError,
  ReceiveEvent,
  ReceiveEventError,
  ReceiveEventStreamEnd,
}

export interface SendEvent<Res, Req = undefined, _ = undefined, __ = undefined> extends Eventa<{ invokeId: string, content: Req }> {
  id: EventTag<Res, Req>
  invokeType: InvokeEventType.SendEvent
}
export interface SendEventError<Res, Req = undefined, _ = undefined, ReqErr = Error> extends Eventa<{ invokeId: string, content: ReqErr }> {
  id: EventTag<Res, Req>
  invokeType: InvokeEventType.SendEventError
}
export interface ReceiveEvent<Res, Req = undefined, _ = undefined, __ = undefined> extends Eventa<{ invokeId: string, content: Res }> {
  id: EventTag<Res, Req>
  invokeType: InvokeEventType.ReceiveEvent
}
export interface ReceiveEventError<Res, Req = undefined, ResErr = undefined, _ = undefined> extends Eventa<{ invokeId: string, content: { error: ResErr } }> {
  id: EventTag<Res, Req>
  invokeType: InvokeEventType.ReceiveEventError
}
export interface ReceiveEventStreamEnd<Res, Req = undefined, _ = undefined, __ = undefined> extends Eventa<{ invokeId: string, content: undefined }> {
  id: EventTag<Res, Req>
  invokeType: InvokeEventType.ReceiveEventStreamEnd
}

export interface InvokeEventa<Res, Req = undefined, ResErr = Error, ReqErr = Error> {
  sendEvent: SendEvent<Res, Req, ResErr, ReqErr>
  sendEventError: SendEventError<Res, Req, ResErr, ReqErr>
  receiveEvent: ReceiveEvent<Res, Req, ResErr, ReqErr>
  receiveEventError: ReceiveEventError<Res, Req, ResErr, ReqErr>
  receiveEventStreamEnd: ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>
}

export function defineInvokeEventa<Res, Req = undefined, ResErr = Error, ReqErr = Error>(tag?: string) {
  if (!tag) {
    tag = nanoid()
  }

  const sendEvent = {
    ...defineEventa<InvokeEventType.SendEvent>(`${tag}-send`),
    invokeType: InvokeEventType.SendEvent
  } as SendEvent<Res, Req, ResErr, ReqErr>
  const sendEventError = {
    ...defineEventa<InvokeEventType.SendEventError>(`${tag}-send-error`),
    invokeType: InvokeEventType.SendEventError
  } as SendEventError<Res, Req, ResErr, ReqErr>
  const receiveEvent = {
    ...defineEventa<InvokeEventType.ReceiveEvent>(`${tag}-receive`),
    invokeType: InvokeEventType.ReceiveEvent
  } as ReceiveEvent<Res, Req, ResErr, ReqErr>
  const receiveEventError = {
    ...defineEventa<InvokeEventType.ReceiveEventError>(`${tag}-receive-error`),
    invokeType: InvokeEventType.ReceiveEventError
  } as ReceiveEventError<Res, Req, ResErr, ReqErr>
  const receiveEventStreamEnd = {
    ...defineEventa<InvokeEventType.ReceiveEventStreamEnd>(`${tag}-receive-stream-end`),
    invokeType: InvokeEventType.ReceiveEventStreamEnd
  } as ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>

  return {
    sendEvent,
    sendEventError,
    receiveEvent,
    receiveEventError,
    receiveEventStreamEnd,
  } satisfies InvokeEventa<Res, Req, ResErr, ReqErr>
}
