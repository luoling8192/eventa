import { describe, expect, it } from 'vitest'

import { createContext } from './context'
import { defineInvokeEventa } from './invoke-shared'
import { defineStreamInvoke, defineStreamInvokeHandler, toStreamHandler } from './stream'

describe('stream', () => {
  it('should handle request-stream-response pattern', async () => {
    const ctx = createContext()

    interface Parameter { type: 'parameters', name: string, age: number }
    interface Progress { type: 'progress', progress: number }
    interface Result { type: 'result', result: boolean }

    const events = defineInvokeEventa<Parameter | Progress | Result, { name: string, age: number }>()

    defineStreamInvokeHandler(ctx, events, ({ name, age }) => {
      return (async function* () {
        yield { type: 'parameters', name, age } as Parameter

        for (let i = 0; i < 5; i++) {
          yield { type: 'progress', progress: (i + 1) * 20 } as Progress
        }

        yield { type: 'result', result: true } as Result
      }())
    })

    const invoke = defineStreamInvoke(ctx, events)

    let parametersName: string | undefined
    let parametersAge: number | undefined
    let progressCalled = 0
    let resultCalled = 0

    for await (const streamResult of invoke({ name: 'alice', age: 25 })) {
      switch (streamResult.type) {
        case 'parameters':
          parametersName = streamResult.name
          parametersAge = streamResult.age
          break
        case 'progress':
          progressCalled++
          break
        case 'result':
          resultCalled++
          break
      }
    }

    expect(parametersName).toBe('alice')
    expect(parametersAge).toBe(25)
    expect(progressCalled).toBe(5)
    expect(resultCalled).toBe(1)
  })

  it('should handle request-stream-response pattern with to stream handler', async () => {
    const ctx = createContext()

    interface Parameter { type: 'parameters', name: string, age: number }
    interface Progress { type: 'progress', progress: number }
    interface Result { type: 'result', result: boolean }

    const events = defineInvokeEventa<Parameter | Progress | Result, { name: string, age: number }>()

    defineStreamInvokeHandler(ctx, events, toStreamHandler(async ({ payload, emit }) => {
      emit({ type: 'parameters', name: payload.name, age: payload.age })

      for (let i = 0; i < 5; i++) {
        emit({ type: 'progress', progress: (i + 1) * 20 } as Progress)
      }

      emit({ type: 'result', result: true } as Result)
    }))

    const invoke = defineStreamInvoke(ctx, events)

    let parametersName: string | undefined
    let parametersAge: number | undefined
    let progressCalled = 0
    let resultCalled = 0

    for await (const streamResult of invoke({ name: 'alice', age: 25 })) {
      switch (streamResult.type) {
        case 'parameters':
          parametersName = streamResult.name
          parametersAge = streamResult.age
          break
        case 'progress':
          progressCalled++
          break
        case 'result':
          resultCalled++
          break
      }
    }

    expect(parametersName).toBe('alice')
    expect(parametersAge).toBe(25)
    expect(progressCalled).toBe(5)
    expect(resultCalled).toBe(1)
  })
})
