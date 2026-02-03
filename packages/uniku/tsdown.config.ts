import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: [
    'src/cuid2/cuid2.ts',
    'src/ksuid/ksuid.ts',
    'src/nanoid/nanoid.ts',
    'src/ulid/ulid.ts',
    'src/uuid/v4.ts',
    'src/uuid/v7.ts',
  ],
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    entrypoints: ['./uuid/v4', './uuid/v7', './ulid', './cuid2', './nanoid', './ksuid'],
    profile: 'esm-only',
  },
})
