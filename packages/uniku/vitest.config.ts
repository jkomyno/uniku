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
      {
        test: {
          ...baseTestConfig,
          name: 'benchmarks',
          include: [],
          benchmark: { include: ['__tests__/bench/**/*.bench.ts'] },
          // Plain Node imports. The Vite module runner reads every import through a
          // getter, and Vitest's Node loader transforms files outside node_modules,
          // including the built uniku entry points. Both add cost to every call.
          experimental: { viteModuleRunner: false, nodeLoader: false },
        },
      },
    ],
  },
})
