import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../vitest.config.base'

const alias = {
  '@/src': resolve(import.meta.dirname, 'src'),
}

export default defineConfig({
  resolve: { alias },
  test: {
    ...baseTestConfig,
    include: ['__tests__/**/*.test.ts'],
  },
})
