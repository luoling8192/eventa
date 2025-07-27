import { createApp } from 'h3'
import { describe, expect, it } from 'vitest'

import { createContext } from '../context'
import { defineEventa } from '../eventa'
import { createWsAdapter } from './browser'
import { createH3WsAdapter } from './h3'

describe.todo('ws-adapter', () => {
  it('should works', () => {
    // Create server
    const h3Adapter = createH3WsAdapter(createApp(), new Set())
    const serverContext = createContext({ adapter: h3Adapter })

    // Create client
    const wsAdapter = createWsAdapter('localhost:3000')
    const clientContext = createContext({ adapter: wsAdapter })

    // Create events
    const clientEvent = defineEventa<{ name: string, age: number }>('rpc') // trigger -> server
    const serverEvent = defineEventa<{ id: string }>('rpc_response') // trigger_response -> client

    const data = {
      name: 'alice',
      age: 12,
    }

    serverContext.on(clientEvent, ({ name, age }) => {
      expect(name).toBe(data.name)
      expect(age).toBe(data.age)

      serverContext.emit(serverEvent, { id: name + age })
    })

    clientContext.on(serverEvent, ({ id }) => {
      expect(id).toBe(data.name + data.age)
    })

    clientContext.emit(clientEvent, { name: data.name, age: data.age })
  })
})
