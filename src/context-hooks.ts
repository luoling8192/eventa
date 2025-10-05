import type { Eventa, EventTag } from './eventa'

interface EventaAdapterProps<EmitOptions = any> {
  cleanup: () => void

  hooks: {
    /**
     * When `ctx.on`, `ctx.once` called, call `onReceived`
     */
    onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => void

    /**
     * When `ctx.emit` called, call `onSent`
     */
    onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req, options?: EmitOptions) => void
  }
}

export type EventaAdapter<EmitOptions = any> = <P>(emit: (event: Eventa<P>, payload: P, options?: EmitOptions) => void) => EventaAdapterProps
