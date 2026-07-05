import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: [
    // Public entry points
    'src/cuid2/cuid2.ts',
    'src/errors.ts',
    'src/ksuid/ksuid.ts',
    'src/nanoid/nanoid.ts',
    'src/typeid/typeid.ts',
    'src/ulid/ulid.ts',
    'src/uuid/v4.ts',
    'src/uuid/v7.ts',
  ],
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    // Only check public entry points
    entrypoints: ['./uuid/v4', './uuid/v7', './ulid', './typeid', './cuid2', './nanoid', './ksuid', './errors'],
    profile: 'esm-only',
  },
})
