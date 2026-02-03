import type { OutExtensionContext, UserConfig } from 'tsdown'

/**
 * Shared tsdown configuration for all publishable packages.
 * Package-specific options can be overridden by extending this config.
 */
export const baseConfig = {
  entry: ['src/index.ts'],
  outDir: 'build',

  outExtensions: (_ctx: OutExtensionContext) => ({
    js: '.mjs',
    dts: '.d.mts',
  }),

  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  target: 'ES2023',

  onSuccess() {
    console.info('Build succeeded!')
  },

  // Built-in validation tools
  attw: {
    entrypoints: ['.'],
    enabled: true,
    level: 'error',
    profile: 'esm-only',
  },

  publint: {
    enabled: true,
    level: 'error',
  },
} satisfies UserConfig
