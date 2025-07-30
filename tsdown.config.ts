import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'adapters/websocket/index': 'src/adapters/websocket/index.ts',
    'adapters/websocket/h3/index': 'src/adapters/websocket/h3/index.ts',
    'adapters/websocket/browser/index': 'src/adapters/websocket/browser/index.ts',
  },
  dts: true,
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
