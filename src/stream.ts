import type { EventContext } from './context'
import type {
  InvokeEventa,
  ReceiveEvent,
  ReceiveEventError,
  ReceiveEventStreamEnd,
} from './invoke-shared'

import { defineEventa, nanoid } from './eventa'

export function defineStreamInvoke<Res, Req = undefined, ResErr = Error, ReqErr = Error>(clientCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>) {
  return (req: Req) => {
    const invokeId = nanoid()

    const invokeReceiveEvent = defineEventa(`${event.receiveEvent.id}-${invokeId}`) as ReceiveEvent<Res>
    const invokeReceiveEventError = defineEventa(`${event.receiveEventError.id}-${invokeId}`) as ReceiveEventError<ResErr>
    const invokeReceiveEventStreamEnd = defineEventa(`${event.receiveEventStreamEnd.id}-${invokeId}`) as ReceiveEventStreamEnd<Res>

    const stream = new ReadableStream<Res>({
      start(controller) {
        clientCtx.on(invokeReceiveEvent, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.enqueue(payload.body.content as Res)
        })
        clientCtx.on(invokeReceiveEventError, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.error(payload.body.content as ResErr)
        })
        clientCtx.on(invokeReceiveEventStreamEnd, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.close()
        })
      },
      cancel() {
        clientCtx.off(invokeReceiveEvent)
        clientCtx.off(invokeReceiveEventError)
        clientCtx.off(invokeReceiveEventStreamEnd)
      },
    })

    clientCtx.emit(event.sendEvent, { invokeId, content: req }) // emit: event_trigger
    return stream
  }
}

export function defineStreamInvokeHandler<Res, Req = undefined, ResErr = Error, ReqErr = Error>(serverCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>, fn: (payload: Req) => AsyncGenerator<Res, void, unknown>) {
  serverCtx.on(event.sendEvent, async (payload) => { // on: event_trigger
    if (!payload.body) {
      return
    }
    if (!payload.body.invokeId) {
      return
    }

    const invokeReceiveEvent = defineEventa(`${event.receiveEvent.id}-${payload.body.invokeId}`) as ReceiveEvent<Res>
    const invokeReceiveEventError = defineEventa(`${event.receiveEventError.id}-${payload.body.invokeId}`) as ReceiveEventError<ResErr>
    const invokeReceiveEventStreamEnd = defineEventa(`${event.receiveEventStreamEnd.id}-${payload.body.invokeId}`) as ReceiveEventStreamEnd<Res>

    try {
      const generator = fn(payload.body.content as Req) // Call the handler function with the request payload
      for await (const res of generator) {
        serverCtx.emit(invokeReceiveEvent, { ...payload.body, content: res }) // emit: event_response
      }

      serverCtx.emit(invokeReceiveEventStreamEnd, { ...payload.body, content: undefined }) // emit: event_stream_end
    }
    catch (error) {
      serverCtx.emit(invokeReceiveEventError, { ...payload.body, content: error as any }) // emit: event_response with error
    }
  })
}

export function toStreamHandler<Req, Res>(handler: (context: { payload: Req, emit: (data: Res) => void }) => Promise<void>): (payload: Req) => AsyncGenerator<Res, void, unknown> {
  return (payload) => {
    const values: Promise<[Res, boolean]>[] = []
    let resolve: (x: [Res, boolean]) => void
    let handlerError: Error | null = null

    values.push(new Promise((r) => {
      resolve = r
    }))

    const emit = (data: Res) => {
      resolve([data, false])
      values.push(new Promise((r) => {
        resolve = r
      }))
    }

    // Start the handler and mark completion when done
    handler({ payload, emit })
      .then(() => {
        resolve([undefined as any, true])
      })
      .catch((err) => {
        handlerError = err
        resolve([undefined as any, true])
      })

    return (async function* () {
      let val: Res
      for (let i = 0, done = false; !done; i++) {
        [val, done] = await values[i]
        delete values[i] // Clean up memory

        if (handlerError) {
          throw handlerError
        }

        if (!done) {
          yield val
        }
      }
    }())
  }
}
