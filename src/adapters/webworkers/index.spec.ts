/// <reference types="vitest" />
/// <reference types="vite/client" />

import Worker from 'web-worker'

import { describe, expect, it } from 'vitest'

import { createContext } from '.'
import { defineInvoke } from '../../invoke'
import { defineInvokeEventa } from '../../invoke-shared'

describe('web workers', async () => {
  it('should handle web worker events', async () => {
    const worker = new Worker(new URL('./worker/test-worker.ts', import.meta.url), { type: 'module' })
    const { context: ctx } = createContext(worker)

    const invokeEvents = defineInvokeEventa<{ output: string }, { input: string }>('test-worker-invoke')
    const input = defineInvoke(ctx, invokeEvents)

    const res = await input({ input: 'Hello, Worker!' })
    expect(res.output).toBe('Worker received: Hello, Worker!')
  })
})
