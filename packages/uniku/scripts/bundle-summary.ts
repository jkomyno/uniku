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
 *   bun scripts/bundle-summary.ts --root ../base/packages/uniku --json base.json
 *   bun scripts/bundle-summary.ts --baseline base.json
 *
 * Options:
 *   --root <dir>       Measure the source and entry points of another uniku checkout
 *   --json <file>      Write the sizes as JSON instead of printing a table
 *   --baseline <file>  Print each entry point's change against sizes written by --json
 *
 * Output:
 *   - In CI (CI=true): Markdown table for GitHub PR comments
 *   - In terminal: Bun.inspect.table() with ANSI colors
 *
 * @module
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build as tsdownBuild } from 'tsdown'
import {
  type BundleSize,
  type BundleSizeDiff,
  diffBundleSizes,
  formatBundleDelta,
  formatBytes,
  hasBundleSizeChange,
  loadBundleSizes,
} from './bundle-sizes'
import type { EntryPoint } from './entrypoints.mjs'

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

const args = Bun.argv.slice(2)

function optionValue(name: string): string | undefined {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const bundler = optionValue('--bundler') ?? 'tsdown'
const packageRoot = resolve(optionValue('--root') ?? resolve(import.meta.dir, '..'))
const jsonPath = optionValue('--json')
const baselinePath = optionValue('--baseline')

if (!['tsdown', 'bun'].includes(bundler)) {
  console.error('Error: --bundler must be "tsdown" or "bun"')
  process.exit(1)
}

// Read the manifest of the measured checkout, so a checkout that adds or removes
// an entry point is measured with its own list.
const { ENTRYPOINTS }: { ENTRYPOINTS: readonly EntryPoint[] } = await import(
  pathToFileURL(resolve(packageRoot, 'scripts/entrypoints.mjs')).href
)

/**
 * Calculate bundle size using Bun.build() with metafile
 */
async function calculateWithBun(entry: EntryPoint): Promise<BundleSize> {
  const entryPath = resolve(packageRoot, entry.src)
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

  // Whether this entry uses external deps (cuid2 uses @noble/hashes)
  const { hasExternal } = entry

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
  const entryPath = resolve(packageRoot, entry.src)
  const tmpDir = resolve(packageRoot, '.tmp-bundle-analysis')

  // Use tsdown programmatic API with silenced console
  const bundles = await withSilentConsole(() =>
    tsdownBuild({
      cwd: packageRoot,
      entry: [entryPath],
      outDir: tmpDir,
      minify: true,
      format: 'es',
      dts: false,
      clean: true,
      deps: { neverBundle: ['@noble/hashes', '@noble/hashes/*'] },
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

  if (jsChunk?.type !== 'chunk') {
    throw new Error(`No JS chunk found for ${entry.name}`)
  }

  const outputPath = resolve(jsChunk.outDir, jsChunk.fileName)
  const content = await Bun.file(outputPath).bytes()
  const gzipped = Bun.gzipSync(content, { level: 9 })

  // Cleanup temp directory
  await Bun.spawn(['rm', '-rf', tmpDir]).exited

  // Whether this entry uses external deps (cuid2 uses @noble/hashes)
  const { hasExternal } = entry

  return {
    name: entry.name,
    minifiedBytes: content.length,
    gzipBytes: gzipped.length,
    hasExternal,
  }
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

if (jsonPath) {
  writeFileSync(jsonPath, `${JSON.stringify(sizes, null, 2)}\n`)
  process.exit(0)
}

const externalNote = 'Excludes external dependencies (e.g., @noble/hashes)'

if (baselinePath) {
  printBaselineComparison(diffBundleSizes(loadBundleSizes(baselinePath), sizes))
} else {
  printSizes(sizes)
}

function printSizes(entries: BundleSize[]): void {
  const hasAnyExternal = entries.some((s) => s.hasExternal)

  if (isCI) {
    console.log('## Bundle Impact\n')
    console.log('| Import | Minified + gzipped |')
    console.log('|--------|-------------------:|')
    for (const size of entries) {
      const sizeStr = formatBytes(size.gzipBytes) + (size.hasExternal ? '*' : '')
      console.log(`| \`${size.name}\` | ${sizeStr} |`)
    }
    if (hasAnyExternal) {
      console.log(`\n*${externalNote}`)
    }
  } else {
    console.log('\x1b[1;36m## Bundle Impact\x1b[0m\n')
    console.log(
      Bun.inspect.table(
        entries.map((s) => ({
          Import: s.name,
          'Minified + gzipped': `\x1b[32m${formatBytes(s.gzipBytes)}${s.hasExternal ? '*' : ''}\x1b[0m`,
        })),
        { colors: true },
      ),
    )
    if (hasAnyExternal) {
      console.log(`\n\x1b[33m*${externalNote}\x1b[0m`)
    }
  }
}

function printBaselineComparison(rows: BundleSizeDiff[]): void {
  const hasAnyExternal = rows.some((row) => row.hasExternal)
  const changed = rows.filter(hasBundleSizeChange).length
  const verdict =
    changed === 0 ? 'No entry point changed size.' : `${changed} of ${rows.length} entry points changed size.`
  const formatSize = (bytes: number | undefined) => (bytes === undefined ? 'N/A' : formatBytes(bytes))

  if (isCI) {
    console.log('## Bundle Impact\n')
    console.log(`Minified + gzipped. ${verdict}\n`)
    console.log('| Import | Base | Head | Change |')
    console.log('|--------|-----:|-----:|-------:|')
    for (const row of rows) {
      const name = `\`${row.name}\`${row.hasExternal ? '*' : ''}`
      const delta = formatBundleDelta(row)
      const change = hasBundleSizeChange(row) ? `**${delta}**` : delta
      console.log(`| ${name} | ${formatSize(row.baseBytes)} | ${formatSize(row.headBytes)} | ${change} |`)
    }
    if (hasAnyExternal) {
      console.log(`\n*${externalNote}`)
    }
  } else {
    console.log('\x1b[1;36m## Bundle Impact\x1b[0m\n')
    console.log(`${verdict}\n`)
    console.log(
      Bun.inspect.table(
        rows.map((row) => ({
          Import: `${row.name}${row.hasExternal ? '*' : ''}`,
          Base: formatSize(row.baseBytes),
          Head: formatSize(row.headBytes),
          Change: formatBundleDelta(row),
        })),
        { colors: true },
      ),
    )
    if (hasAnyExternal) {
      console.log(`\n\x1b[33m*${externalNote}\x1b[0m`)
    }
  }
}
