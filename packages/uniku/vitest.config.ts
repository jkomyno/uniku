import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../vitest.config.base'

const alias = {
  '@/src': resolve(import.meta.dirname, 'src'),
}

export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          ...baseTestConfig,
          name: 'unit',
          include: ['__tests__/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          ...baseTestConfig,
          name: 'integration',
          include: ['__tests__/integration/**/*.test.ts'],
        },
      },
    ],
    benchmark: {
      include: ['__tests__/bench/**/*.bench.ts'],
      outputJson: 'bench-results.json',
    },
  },
})
