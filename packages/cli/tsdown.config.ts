import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base'

export default defineConfig({
  ...baseConfig,
  entry: ['src/bin.ts'],
  platform: 'node',
  tsconfig: 'tsconfig.build.json',
  // CLI binary — no consumers import it as a library (only `bin`, no
  // `types`/`exports`), so emit no declarations. This also avoids the
  // rolldown-plugin-dts:fake-js SOURCEMAP_BROKEN warning that (unlike the
  // isolatedDeclarations-based `uniku` build) this bundle triggers, which
  // `failOnWarn: 'ci-only'` would otherwise turn into a CI build failure.
  dts: false,
  // CLI binary — no need for attw/publint checks
  attw: undefined,
  publint: undefined,
})
