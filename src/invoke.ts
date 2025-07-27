import type { EventContext } from './context'
import type { InvokeEventa } from './invoke-shared'

import { nanoid } from './eventa'

export function defineInvoke<Res, Req = undefined, ResErr = Error, ReqErr = Error>(clientCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>) {
  const mInvokeIdPromiseResolvers = new Map<string, (value: Res | PromiseLike<Res>) => void>()
  const mInvokeIdPromiseRejectors = new Map<string, (err?: any) => void>()

  return (req: Req) => new Promise<Res>((resolve, reject) => {
    const invokeId = nanoid()
    mInvokeIdPromiseResolvers.set(invokeId, resolve)
    mInvokeIdPromiseRejectors.set(invokeId, reject)

    clientCtx.on(event.receiveEvent, (payload) => {
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
      clientCtx.off(event.receiveEvent) // Clean up listener after receiving response
    })

    clientCtx.on(event.receiveEventError, (payload) => {
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
    })

    clientCtx.emit(event.sendEvent, { invokeId, content: req }) // emit: event_trigger
  })
}

export function defineInvokeHandler<Res, Req = undefined, ResErr = Error, ReqErr = Error>(serverCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>, fn: (payload: Req) => Res) {
  serverCtx.on(event.sendEvent, (payload) => { // on: event_trigger
    if (!payload.body) {
      return
    }
    if (!payload.body.invokeId) {
      return
    }

    try {
      const response = fn(payload.body?.content as Req) // Call the handler function with the request payload
      serverCtx.emit(event.receiveEvent, { ...payload.body, content: response }) // emit: event_response
    }
    catch (error) {
      // TODO: to error object
      serverCtx.emit(event.receiveEventError, { ...payload.body, content: error as any }) // emit: event_response with error
    }
  })
}
