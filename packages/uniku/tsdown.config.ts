import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: ['src/uuid/v4.ts', 'src/uuid/v7.ts', 'src/ulid/ulid.ts'],
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    entrypoints: ['./uuid/v4', './uuid/v7', './ulid'],
    profile: 'esm-only',
  },
})
