import type { Eventa, EventTag } from './eventa'

interface EventaAdapterProps {
  cleanup: () => void

  hooks: {
    /**
     * When `ctx.on`, `ctx.once` called, call `onReceived`
     */
    onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => void

    /**
     * When `ctx.emit` called, call `onSent`
     */
    onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => void
  }
}

export type EventaAdapter = <P>(emit: (event: Eventa<P>, payload: P) => void) => EventaAdapterProps
