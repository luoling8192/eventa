import type { EventContext } from './context'
import type { InvokeEventa, ReceiveEvent, ReceiveEventError } from './invoke-shared'

import { defineEventa, nanoid } from './eventa'

type IsInvokeRequestOptional<EC extends EventContext<any, any>>
  = EC extends EventContext<infer E>
    ? E extends { invokeRequest?: any }
      ? undefined extends E['invokeRequest']
        ? true
        : false
      : true
    : true

type ExtractInvokeRequest<EC extends EventContext<any, any>>
  = EC extends EventContext<infer E>
    ? E extends { invokeRequest: infer IR }
      ? IR
      : E extends { invokeRequest?: infer IR }
        ? IR
        : undefined
    : undefined

interface InvocableEventContext<Res, Req, ResErr, ReqErr, E, EO> extends EventContext<E, EO> {
  invokeHandlers?: Map<string, Map<(payload: Req) => Promise<Res> | Res, (params: InvokeEventa<Res, Req, ResErr, ReqErr>['sendEvent'], eventOptions?: EO) => void>>
}

export function defineInvoke<
  Res,
  Req = undefined,
  ResErr = Error,
  ReqErr = Error,
  E = any,
  EO = any,
  EC extends EventContext<E, EO> = EventContext<E, EO>,
>(clientCtx: EC, event: InvokeEventa<Res, Req, ResErr, ReqErr>) {
  const mInvokeIdPromiseResolvers = new Map<string, (value: Res | PromiseLike<Res>) => void>()
  const mInvokeIdPromiseRejectors = new Map<string, (err?: any) => void>()

  type InvokeRequestType = ExtractInvokeRequest<EC>

  function _invoke(req: Req, options?: { invokeRequest?: InvokeRequestType }): Promise<Res> {
    return new Promise<Res>((resolve, reject) => {
      const invokeId = nanoid()
      mInvokeIdPromiseResolvers.set(invokeId, resolve)
      mInvokeIdPromiseRejectors.set(invokeId, reject)

      const invokeReceiveEvent = defineEventa(`${event.receiveEvent.id}-${invokeId}`) as ReceiveEvent<Res>
      const invokeReceiveEventError = defineEventa(`${event.receiveEventError.id}-${invokeId}`) as ReceiveEventError<ResErr>

      clientCtx.on(invokeReceiveEvent, (payload) => {
        if (!payload.body) {
          return
        }
        if (payload.body.invokeId !== invokeId) {
          return
        }

        const { content } = payload.body
        mInvokeIdPromiseResolvers.get(invokeId)?.(content as Res)
        mInvokeIdPromiseResolvers.delete(invokeId)
        mInvokeIdPromiseRejectors.delete(invokeId)
        clientCtx.off(invokeReceiveEvent)
        clientCtx.off(invokeReceiveEventError)
      })

      clientCtx.on(invokeReceiveEventError, (payload) => {
        if (!payload.body) {
          return
        }
        if (payload.body.invokeId !== invokeId) {
          return
        }

        const { error } = payload.body.content
        mInvokeIdPromiseRejectors.get(invokeId)?.(error)
        mInvokeIdPromiseRejectors.delete(invokeId)
        mInvokeIdPromiseResolvers.delete(invokeId)
        clientCtx.off(invokeReceiveEvent)
        clientCtx.off(invokeReceiveEventError)
      })

      clientCtx.emit(event.sendEvent, { invokeId, content: req }, options as any) // emit: event_trigger
    })
  }

  type InvokeFunction
    = Req extends undefined
      ? IsInvokeRequestOptional<EC> extends true
        ? (req?: Req, invokeRequest?: InvokeRequestType) => Promise<Res>
        : (req: Req, invokeRequest: InvokeRequestType) => Promise<Res>
      : IsInvokeRequestOptional<EC> extends true
        ? (req: Req, invokeRequest?: InvokeRequestType) => Promise<Res>
        : (req: Req, invokeRequest: InvokeRequestType) => Promise<Res>

  return _invoke as InvokeFunction
}

/**
 * Define an invoke handler for a specific invoke event.
 *
 * @param serverCtx The event context in which to define the invoke handler.
 * @param event The invoke event for which the handler is to be defined.
 * @param handler The handler function to be invoked when the event is triggered.
 * @returns A function that can be called to remove the invoke handler.
 */
export function defineInvokeHandler<
  Res,
  Req = undefined,
  ResErr = Error,
  ReqErr = Error,
  E = any,
  EO = any,
>(serverCtx: InvocableEventContext<Res, Req, ResErr, ReqErr, E, EO>, event: InvokeEventa<Res, Req, ResErr, ReqErr>, handler: (payload: Req) => Promise<Res> | Res): () => void {
  if (!serverCtx.invokeHandlers) {
    serverCtx.invokeHandlers = new Map()
  }

  let handlers = serverCtx.invokeHandlers?.get(event.sendEvent.id)
  if (!handlers) {
    handlers = new Map()
    serverCtx.invokeHandlers?.set(event.sendEvent.id, handlers)
  }

  let internalHandler = handlers.get(handler)
  if (!internalHandler) {
    internalHandler = async (payload) => { // on: event_trigger
      if (!payload.body) {
        return
      }
      if (!payload.body.invokeId) {
        return
      }

      try {
        const response = await handler(payload.body?.content as Req) // Call the handler function with the request payload
        serverCtx.emit(defineEventa(`${event.receiveEvent.id}-${payload.body.invokeId}`) as ReceiveEvent<Res>, { ...payload.body, content: response }) // emit: event_response
      }
      catch (error) {
        // TODO: to error object
        serverCtx.emit(defineEventa(`${event.receiveEventError.id}-${payload.body.invokeId}`) as ReceiveEventError<ResErr>, { ...payload.body, content: error as any })
      }
    }
    handlers.set(handler, internalHandler)
    serverCtx.on(event.sendEvent, internalHandler)
  }

  return () => serverCtx.off(event.sendEvent, internalHandler)
}

/**
 * Remove one or all invoke handlers for a specific invoke event.
 *
 * @param serverCtx The event context from which to remove the invoke handler(s).
 * @param event The invoke event whose handlers are to be removed.
 * @param handler The specific handler to remove. If not omitted, all handlers for the event will be removed.
 * @returns `true` if at least one handler was removed, `false` otherwise
 */
export function undefineInvokeHandler<
  Res,
  Req = undefined,
  ResErr = Error,
  ReqErr = Error,
  E = any,
  EO = any,
>(serverCtx: InvocableEventContext<Res, Req, ResErr, ReqErr, E, EO>, event: InvokeEventa<Res, Req, ResErr, ReqErr>, handler?: (payload: Req) => Promise<Res> | Res): boolean {
  if (!serverCtx.invokeHandlers)
    return false

  const handlers = serverCtx.invokeHandlers?.get(event.sendEvent.id)
  if (!handlers)
    return false

  if (handler) {
    const internalHandler = handlers.get(handler)
    if (!internalHandler)
      return false

    serverCtx.off(event.sendEvent, internalHandler)
    serverCtx.invokeHandlers.delete(event.sendEvent.id)
    return true
  }

  let returnValue = false
  for (const internalHandlers of handlers.values()) {
    serverCtx.off(event.sendEvent, internalHandlers)
    returnValue = true
  }
  serverCtx.invokeHandlers.delete(event.sendEvent.id)
  return returnValue
}
