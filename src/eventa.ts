import { customAlphabet } from 'nanoid'

export function nanoid() {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)()
}

export interface InvokeEventConstraint<_Req, _Res> {}

export type EventTag<Res, Req> = string & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

export interface Eventa<T, P = undefined> {
  id: string
  type?: T
  body?: P
}

export function defineEventa<T, P = undefined>(tag?: string, type?: T) {
  if (!tag) {
    tag = nanoid()
  }

  return {
    id: tag,
    type,
  } satisfies Eventa<T, P>
}
