import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: ['src/bin.ts'],
  platform: 'node',
  tsconfig: 'tsconfig.build.json',
  // CLI binary — no need for attw/publint checks
  attw: undefined,
  publint: undefined,
})
