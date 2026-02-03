import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: ['src/uuid/v4.ts', 'src/uuid/v7.ts', 'src/ulid/ulid.ts', 'src/cuid2/cuid2.ts', 'src/nanoid/nanoid.ts'],
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    entrypoints: ['./uuid/v4', './uuid/v7', './ulid', './cuid2', './nanoid'],
    profile: 'esm-only',
  },
})
