import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ws-adapters/index': 'src/ws-adapters/index.ts',
    'ws-adapters/h3/index': 'src/ws-adapters/h3/index.ts',
    'ws-adapters/browser/index': 'src/ws-adapters/browser/index.ts',
  },
  dts: true,
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
