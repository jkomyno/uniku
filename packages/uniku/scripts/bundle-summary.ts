#!/usr/bin/env bun
/**
 * Bundle Summary Script
 *
 * Analyzes bundle sizes for each entrypoint using either tsdown (default) or Bun's bundler.
 * Reports minified + gzipped bundle sizes.
 *
 * Usage:
 *   pnpm bundle:summary                      # Use tsdown (default)
 *   bun scripts/bundle-summary.ts            # Use tsdown (default)
 *   bun scripts/bundle-summary.ts --bundler tsdown
 *   bun scripts/bundle-summary.ts --bundler bun
 *
 * Output:
 *   - In CI (CI=true): Markdown table for GitHub PR comments
 *   - In terminal: Bun.inspect.table() with ANSI colors
 *
 * @module
 */

import { resolve } from 'node:path'
import { build as tsdownBuild } from 'tsdown'

/**
 * Temporarily silence console output during an async operation.
 */
async function withSilentConsole<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log
  const originalInfo = console.info
  console.log = () => {
    /* noop */
  }
  console.info = () => {
    /* noop */
  }
  try {
    return await fn()
  } finally {
    console.log = originalLog
    console.info = originalInfo
  }
}

const isCI = Bun.env.CI === 'true'

// Parse --bundler flag
const args = Bun.argv.slice(2)
const bundlerIndex = args.indexOf('--bundler')
const bundler = bundlerIndex !== -1 ? args[bundlerIndex + 1] : 'tsdown'

if (!['tsdown', 'bun'].includes(bundler)) {
  console.error('Error: --bundler must be "tsdown" or "bun"')
  process.exit(1)
}

const ENTRYPOINTS = [
  { name: 'uniku/uuid/v4', src: 'src/uuid/v4.ts' },
  { name: 'uniku/uuid/v7', src: 'src/uuid/v7.ts' },
  { name: 'uniku/ulid', src: 'src/ulid/ulid.ts' },
  { name: 'uniku/cuid2', src: 'src/cuid2/cuid2.ts' },
  { name: 'uniku/nanoid', src: 'src/nanoid/nanoid.ts' },
  { name: 'uniku/ksuid', src: 'src/ksuid/ksuid.ts' },
] as const

type EntryPoint = (typeof ENTRYPOINTS)[number]

interface BundleSize {
  name: string
  minifiedBytes: number
  gzipBytes: number
  hasExternal: boolean
}

/**
 * Calculate bundle size using Bun.build() with metafile
 */
async function calculateWithBun(entry: EntryPoint): Promise<BundleSize> {
  const entryPath = resolve(import.meta.dir, '..', entry.src)

  const result = await Bun.build({
    entrypoints: [entryPath],
    minify: true,
    external: ['@noble/hashes', '@noble/hashes/*'],
  })

  if (!result.success) {
    console.error(`Build failed for ${entry.name}:`, result.logs)
    throw new Error(`Build failed for ${entry.name}`)
  }

  const output = result.outputs[0]
  const minifiedContent = await output.arrayBuffer()
  const minifiedBytes = new Uint8Array(minifiedContent)
  const gzipped = Bun.gzipSync(minifiedBytes, { level: 9 })

  // Check if this entry uses external deps (cuid2 uses @noble/hashes)
  const hasExternal = entry.name === 'uniku/cuid2'

  return {
    name: entry.name,
    minifiedBytes: minifiedBytes.byteLength,
    gzipBytes: gzipped.length,
    hasExternal,
  }
}

/**
 * Calculate bundle size using tsdown programmatic API
 */
async function calculateWithTsdown(entry: EntryPoint): Promise<BundleSize> {
  const entryPath = resolve(import.meta.dir, '..', entry.src)
  const tmpDir = resolve(import.meta.dir, '../.tmp-bundle-analysis')

  // Use tsdown programmatic API with silenced console
  const bundles = await withSilentConsole(() =>
    tsdownBuild({
      entry: [entryPath],
      outDir: tmpDir,
      minify: true,
      format: 'es',
      dts: false,
      clean: true,
      external: ['@noble/hashes', '@noble/hashes/*'],
      report: false, // We'll compute sizes ourselves
      config: false, // Don't load tsdown.config.ts
    }),
  )

  // Find the JS output chunk
  const bundle = bundles[0]
  if (!bundle) {
    throw new Error(`No bundle output for ${entry.name}`)
  }

  // Get the output file content
  const jsChunk = bundle.chunks.find((chunk) => chunk.type === 'chunk' && chunk.fileName.endsWith('.mjs'))

  if (!jsChunk || jsChunk.type !== 'chunk') {
    throw new Error(`No JS chunk found for ${entry.name}`)
  }

  const outputPath = resolve(jsChunk.outDir, jsChunk.fileName)
  const content = await Bun.file(outputPath).bytes()
  const gzipped = Bun.gzipSync(content, { level: 9 })

  // Cleanup temp directory
  await Bun.spawn(['rm', '-rf', tmpDir]).exited

  // Check if this entry uses external deps
  const hasExternal = entry.name === 'uniku/cuid2'

  return {
    name: entry.name,
    minifiedBytes: content.length,
    gzipBytes: gzipped.length,
    hasExternal,
  }
}

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `~${bytes} B`
  }
  const kb = bytes / 1024
  return `~${kb.toFixed(1)} KB`
}

// Main execution
const calculateSize = bundler === 'bun' ? calculateWithBun : calculateWithTsdown

// Calculate sizes for all entrypoints
const sizes: BundleSize[] = []
for (const entry of ENTRYPOINTS) {
  try {
    sizes.push(await calculateSize(entry))
  } catch (error) {
    console.error(`Error calculating size for ${entry.name}:`, error)
  }
}

if (sizes.length === 0) {
  console.error('Error: No entrypoints could be analyzed.')
  process.exit(1)
}

// Check if any entrypoint has external dependencies
const hasAnyExternal = sizes.some((s) => s.hasExternal)

// Output
if (isCI) {
  // Markdown output for CI
  console.log('## Bundle Impact\n')
  console.log('| Import | Minified + gzipped |')
  console.log('|--------|-------------------:|')
  for (const size of sizes) {
    const sizeStr = formatBytes(size.gzipBytes) + (size.hasExternal ? '*' : '')
    console.log(`| \`${size.name}\` | ${sizeStr} |`)
  }
  if (hasAnyExternal) {
    console.log('\n*Excludes external dependencies (e.g., @noble/hashes)')
  }
} else {
  // Terminal output with Bun.inspect.table()
  console.log('\x1b[1;36m## Bundle Impact\x1b[0m\n')
  console.log(
    Bun.inspect.table(
      sizes.map((s) => ({
        Import: s.name,
        'Minified + gzipped': `\x1b[32m${formatBytes(s.gzipBytes)}${s.hasExternal ? '*' : ''}\x1b[0m`,
      })),
      { colors: true },
    ),
  )
  if (hasAnyExternal) {
    console.log('\n\x1b[33m*Excludes external dependencies (e.g., @noble/hashes)\x1b[0m')
  }
}
