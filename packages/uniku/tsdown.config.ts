import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'
import { ENTRYPOINTS } from './scripts/entrypoints.mjs'

export default defineConfig({
  ...baseConfig,
  // Public entry points, derived from the shared manifest so build entries,
  // bundle-summary, and publish-smoke can never drift apart.
  entry: ENTRYPOINTS.map((entry) => entry.src),
  tsconfig: 'tsconfig.build.json',
  attw: {
    ...baseConfig.attw,
    // Only check public entry points
    entrypoints: ENTRYPOINTS.map((entry) => entry.subpath),
    profile: 'esm-only',
  },
})
