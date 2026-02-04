import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: [
    // Internal platform-specific implementations
    'src/platform/node.ts',
    'src/platform/neutral.ts',
    // Public entry points
    'src/cuid2/cuid2.ts',
    'src/ksuid/ksuid.ts',
    'src/nanoid/nanoid.ts',
    'src/ulid/ulid.ts',
    'src/uuid/v4.ts',
    'src/uuid/v7.ts',
  ],
  external: [
    // #platform is resolved at runtime via package.json exports
    '#platform',
  ],
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    // Only check public entry points, not internal #platform
    entrypoints: ['./uuid/v4', './uuid/v7', './ulid', './cuid2', './nanoid', './ksuid'],
    profile: 'esm-only',
  },
})
