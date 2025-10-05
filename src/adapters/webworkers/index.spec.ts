/// <reference types="vitest" />
/// <reference types="vite/client" />

import type { Mock } from 'vitest'

import Worker from 'web-worker'

import { describe, expect, it, vi } from 'vitest'

import { createContext, defineOutboundWorkerEventa } from '.'
import { defineInvoke, defineInvokeHandler } from '../../invoke'
import { defineInvokeEventa } from '../../invoke-shared'
import { generateWorkerPayload } from './internal'

describe('web workers', async () => {
  it('should handle web worker events', async () => {
    const worker = new Worker(new URL('./worker/test-worker.ts', import.meta.url), { type: 'module' })
    const { context: ctx } = createContext(worker)

    const invokeEvents = defineInvokeEventa<{ output: string }, { input: string }>('test-worker-invoke')
    const input = defineInvoke(ctx, invokeEvents)

    const res = await input({ input: 'Hello, Worker!' })
    expect(res.output).toBe('Worker received: Hello, Worker!')
  })

  it('should be able to invoke over post message with transfer', async () => {
    const worker = new Worker(new URL('./worker/test-worker.ts', import.meta.url), { type: 'module' })
    const { context: ctx } = createContext(worker)

    const invokeEvents = defineInvokeEventa<{ output: string }, { input: { message: string, data: ArrayBuffer } }>('test-worker-with-transfer-invoke')
    const input = defineInvoke(ctx, invokeEvents)

    const buffer = new ArrayBuffer(16)
    const res = await input({ input: { message: 'Hello, Worker!', data: buffer } }, { transfer: [buffer] })
    expect(res.output).toBe('Worker received: Hello, Worker!, 16 bytes')
  })

  it('should be able to handle invoke from worker', async () => {
    const worker = new Worker(new URL('./worker/test-worker.ts', import.meta.url), { type: 'module' })
    const { context: ctx } = createContext(worker)

    const invokeFromWorkerThreadEvents = defineInvokeEventa<Promise<{ output: string }>>('test-worker-from-worker-invoke')
    const input = defineInvoke(ctx, invokeFromWorkerThreadEvents)

    const invokeFromWorkerThreadForMainThread = defineInvokeEventa<{ output: string }, { input: string }>('test-worker-from-worker-invoke-for-main-thread')
    defineInvokeHandler(ctx, invokeFromWorkerThreadForMainThread, ({ input }) => ({ output: `Worker received: ${input}` }))

    const res = await input()
    expect(res.output).toBe('Worker received: Hello from worker thread!')
  })

  it('should be able to handle invoke from worker with transfer', async () => {
    const worker = new Worker(new URL('./worker/test-worker.ts', import.meta.url), { type: 'module' })
    const { context: ctx } = createContext(worker)

    const invokeFromWorkerThreadWithTransferEvents = defineInvokeEventa<Promise<{ output: string }>>('test-worker-from-worker-invoke-with-transfer')
    const input = defineInvoke(ctx, invokeFromWorkerThreadWithTransferEvents)

    const invokeFromWorkerThreadForMainThreadWithTransfer = defineInvokeEventa<{ output: string }, { input: { message: string, data: ArrayBuffer } }>('test-worker-from-worker-invoke-for-main-thread-with-transfer')
    defineInvokeHandler(ctx, invokeFromWorkerThreadForMainThreadWithTransfer, ({ input }) => ({ output: `Worker received: ${input.message}, ${input.data.byteLength} bytes` }))

    const res = await input()
    expect(res.output).toBe('Worker received: Hello from worker thread with transfer!, 32 bytes')
  })

  it('should be able to post message with transfer', async () => {
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onmessage: vi.fn(),
      onerror: null,
      onmessageerror: null,
    } satisfies Worker
    const { context: ctx } = createContext(worker as Worker)
    const eventa = defineOutboundWorkerEventa('worker-transfer')

    const buffer = new ArrayBuffer(8)
    ctx.emit(eventa, { message: buffer, transfer: [buffer] })

    {
      const postMessage = worker.postMessage as unknown as Mock

      expect(postMessage).toHaveBeenCalled()
      expect(postMessage.mock.calls[0][0]).toHaveProperty('id')
      expect(postMessage.mock.calls[0][0]).toHaveProperty('type', 'worker-transfer')
      expect(postMessage.mock.calls[0][0]).toHaveProperty('payload')
      expect(postMessage.mock.calls[0][0].payload).toHaveProperty('id', 'worker-transfer')
      expect(postMessage.mock.calls[0][0].payload).toHaveProperty('type', 'event')
      expect(postMessage.mock.calls[0][0].payload).toHaveProperty('_flowDirection', 'outbound')
      expect(postMessage.mock.calls[0][0].payload).toHaveProperty('_workerTransfer', true)

      expect(postMessage.mock.calls[0][1]).toHaveProperty('transfer')
      expect((postMessage.mock.calls[0][1].transfer as Transferable[]).length).toBe(1)
      expect((postMessage.mock.calls[0][1].transfer as Transferable[])[0]).toBeInstanceOf(ArrayBuffer)
    }

    const onHandler = vi.fn()
    ctx.on(defineOutboundWorkerEventa<ArrayBuffer>('worker-transfer-inbound'), onHandler)

    const messageEvent = new MessageEvent('worker-transfer-inbound', { data: generateWorkerPayload('worker-transfer-inbound', { ...defineOutboundWorkerEventa('worker-transfer-inbound'), body: buffer }) })
    worker.onmessage(messageEvent)

    // eslint-disable-next-line no-lone-blocks
    {
      expect(onHandler).toHaveBeenCalled()
      expect(onHandler.mock.calls[0][0]).toHaveProperty('body')
      expect(onHandler.mock.calls[0][0].body).toHaveProperty('message')
      expect(onHandler.mock.calls[0][0].body.message).toBeInstanceOf(ArrayBuffer)
      expect(onHandler.mock.calls[0][0].body.message).toBe(buffer)
      expect(onHandler.mock.calls[0][0].body.transfer).toBeUndefined()
    }
  })
})
