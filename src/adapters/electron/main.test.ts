/// <reference types="vitest" />
/// <reference types="vite/client" />

import type { BrowserWindow, IpcMain } from 'electron'
import type { Mock } from 'vitest'

import type { Eventa } from '../../eventa'

import { describe, expect, it, vi } from 'vitest'

import { defineEventa, defineInboundEventa } from '../../eventa'
import { defineInvoke, defineInvokeHandler } from '../../invoke'
import { defineInvokeEventa } from '../../invoke-shared'
import { createUntilTriggeredOnce } from '../../utils'
import { createContext } from './main'

describe('event target', async () => {
  it('context should be able to on and emit events', async () => {
    const ipcMain = {
      on: vi.fn(),
    } as unknown as IpcMain
    const browserWindow = {
      webContents: {
        send: vi.fn(),
      },
    } as unknown as BrowserWindow

    const eventa = defineEventa<{ message: string }>()
    const { context: ctx } = createContext(ipcMain, browserWindow)
    const { onceTriggered, wrapper } = createUntilTriggeredOnce<Eventa, Eventa>(event => event)

    ctx.on(eventa, wrapper)
    ctx.emit(defineInboundEventa(eventa.id), { message: 'Hello, Event Target!' }) // emit: event_trigger
    const event = await onceTriggered
    expect(event.body).toEqual({ message: 'Hello, Event Target!' })

    const onMocked = ipcMain.on as Mock
    expect(onMocked).toBeCalledTimes(2)
    expect(onMocked).toBeCalledWith('eventa-message', expect.any(Function))
    expect(onMocked).toBeCalledWith('eventa-error', expect.any(Function))

    const sendMocked = browserWindow.webContents.send as Mock
    ctx.emit(eventa, { message: 'Hello, Eventa!' }) // emit: eventa
    expect(sendMocked).toBeCalledTimes(1)
    expect(sendMocked.mock.calls[0][0]).toBeTypeOf('string')
    expect(sendMocked.mock.calls[0][1]).toBeTypeOf('object')
    expect(sendMocked.mock.calls[0][1].payload.body).toEqual({ message: 'Hello, Eventa!' })
  })

  it('should be able to invoke', async () => {
    const ipcMain = {
      on: vi.fn(),
    } as unknown as IpcMain
    const browserWindow = {
      webContents: {
        send: vi.fn(),
      },
    } as unknown as BrowserWindow

    const { context: ctx } = createContext(ipcMain, browserWindow)

    const events = defineInvokeEventa<Promise<{ output: string }>, { input: number }>()
    const input = defineInvoke(ctx, events)

    defineInvokeHandler(ctx, events, async (payload) => {
      return { output: String(payload.input) }
    })

    const res = await input({ input: 100 })
    expect(res.output).toEqual('100')

    const onMocked = ipcMain.on as Mock
    expect(onMocked).toBeCalledTimes(2)
    expect(onMocked).toBeCalledWith('eventa-message', expect.any(Function))
    expect(onMocked).toBeCalledWith('eventa-error', expect.any(Function))

    const sendMocked = browserWindow.webContents.send as Mock
    expect(sendMocked).toBeCalledTimes(2)
    expect(sendMocked.mock.calls[0][0]).toBeTypeOf('string')
    expect(sendMocked.mock.calls[0][1]).toBeTypeOf('object')
    expect(sendMocked.mock.calls[0][1].payload.body.content).toEqual({ input: 100 })
    expect(sendMocked.mock.calls[1][0]).toBeTypeOf('string')
    expect(sendMocked.mock.calls[1][1]).toBeTypeOf('object')
    expect(sendMocked.mock.calls[1][1].payload.body.content).toEqual({ output: '100' })
  })
})
