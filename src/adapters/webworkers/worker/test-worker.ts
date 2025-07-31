import { createContext } from '.'
import { defineInvokeHandler } from '../../../invoke'
import { defineInvokeEventa } from '../../../invoke-shared'

const { context: ctx } = createContext()

const invokeEvents = defineInvokeEventa<{ output: string }, { input: string }>('test-worker-invoke')
defineInvokeHandler(ctx, invokeEvents, ({ input }) => {
  return { output: `Worker received: ${input}` }
})
