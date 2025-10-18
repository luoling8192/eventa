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

type InvokeFunction<Res, Req, EC extends EventContext<any, any>>
  = Req extends undefined
    ? IsInvokeRequestOptional<EC> extends true
      ? (req?: Req, invokeRequest?: ExtractInvokeRequest<EC>) => Promise<Res>
      : (req: Req, invokeRequest: ExtractInvokeRequest<EC>) => Promise<Res>
    : IsInvokeRequestOptional<EC> extends true
      ? (req: Req, invokeRequest?: ExtractInvokeRequest<EC>) => Promise<Res>
      : (req: Req, invokeRequest: ExtractInvokeRequest<EC>) => Promise<Res>

type InvokeFunctionMap<EventMap extends Record<string, InvokeEventa<any, any, any, any>>, EC extends EventContext<any, any>> = {
  [K in keyof EventMap]: EventMap[K] extends InvokeEventa<infer Res, infer Req, any, any> ? InvokeFunction<Res, Req, EC> : never
}

type Handler<Res, Req = any> = (payload: Req) => Promise<Res> | Res

type InternalInvokeHandler<
  Res,
  Req = any,
  ResErr = Error,
  ReqErr = Error,
  EO = any,
> = (params: InvokeEventa<Res, Req, ResErr, ReqErr>['sendEvent'], eventOptions?: EO) => void

type HandlerMap<EventMap extends Record<string, InvokeEventa<any, any, any, any>>> = {
  [K in keyof EventMap]: EventMap[K] extends InvokeEventa<infer Res, infer Req, any, any> ? Handler<Res, Req> : never
}

interface InvocableEventContext<E, EO> extends EventContext<E, EO> {
  invokeHandlers?: Map<string, Map<Handler<any>, InternalInvokeHandler<any>>>
}

export function defineInvoke<
  Res,
  Req = undefined,
  ResErr = Error,
  ReqErr = Error,
  E = any,
  EO = any,
  EC extends EventContext<E, EO> = EventContext<E, EO>,
>(clientCtx: EC, event: InvokeEventa<Res, Req, ResErr, ReqErr>): InvokeFunction<Res, Req, EC> {
  const mInvokeIdPromiseResolvers = new Map<string, (value: Res | PromiseLike<Res>) => void>()
  const mInvokeIdPromiseRejectors = new Map<string, (err?: any) => void>()

  function _invoke(req: Req, options?: { invokeRequest?: ExtractInvokeRequest<EC> }): Promise<Res> {
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

  return _invoke as InvokeFunction<Res, Req, EC>
}

export function defineInvokes<
  EK extends string,
  EventMap extends Record<EK, InvokeEventa<any, any, any, any>>,
  E = any,
  EO = any,
  EC extends EventContext<E, EO> = EventContext<E, EO>,
>(clientCtx: EC, events: EventMap): InvokeFunctionMap<EventMap, EC> {
  return (Object.keys(events) as EK[]).reduce((invokes, key) => {
    invokes[key] = defineInvoke(clientCtx, events[key])
    return invokes
  }, {} as Record<EK, InvokeFunction<any, any, EC>>) as InvokeFunctionMap<EventMap, EC>
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
>(serverCtx: InvocableEventContext<E, EO>, event: InvokeEventa<Res, Req, ResErr, ReqErr>, handler: Handler<Res, Req>): () => void {
  if (!serverCtx.invokeHandlers) {
    serverCtx.invokeHandlers = new Map()
  }

  let handlers = serverCtx.invokeHandlers?.get(event.sendEvent.id)
  if (!handlers) {
    handlers = new Map()
    serverCtx.invokeHandlers?.set(event.sendEvent.id, handlers)
  }

  let internalHandler = handlers.get(handler) as InternalInvokeHandler<Res, Req, ResErr, ReqErr> | undefined
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

export function defineInvokeHandlers<
  EK extends string,
  EventMap extends Record<EK, InvokeEventa<any, any, any, any>>,
  E = any,
  EO = any,
>(serverCtx: InvocableEventContext<E, EO>, events: EventMap, handlers: HandlerMap<EventMap>): Record<EK, () => void> {
  const eventKeys = Object.keys(events) as EK[]
  const handlerKeys = new Set(Object.keys(handlers) as EK[])

  if (eventKeys.length !== handlerKeys.size || !eventKeys.every(key => handlerKeys.has(key))) {
    throw new Error('The keys of events and handlers must match.')
  }

  return eventKeys.reduce((returnValues, key) => {
    returnValues[key] = defineInvokeHandler(serverCtx, events[key], handlers[key])
    return returnValues
  }, {} as Record<EK, () => void>)
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
>(serverCtx: InvocableEventContext<E, EO>, event: InvokeEventa<Res, Req, ResErr, ReqErr>, handler?: Handler<Res, Req>): boolean {
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
