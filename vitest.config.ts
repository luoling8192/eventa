/// <reference types="vitest" />

import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    include: [
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    setupFiles: ['@vitest/web-worker'],
  },
})
