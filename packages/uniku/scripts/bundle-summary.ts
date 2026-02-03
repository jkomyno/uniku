#!/usr/bin/env bun
/**
 * Bundle Summary Script
 *
 * Analyzes build output and computes minified + gzipped bundle sizes
 * for each entrypoint, including their shared chunk dependencies.
 *
 * Usage:
 *   pnpm bundle:summary        # Run after pnpm build
 *   bun scripts/bundle-summary.ts
 *
 * Output:
 *   - In CI (CI=true): Markdown table for GitHub PR comments
 *   - In terminal: ASCII table with ANSI colors
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const isCI = Bun.env.CI === 'true'
const BUILD_DIR = resolve(import.meta.dir, '../build')

if (!existsSync(BUILD_DIR)) {
  console.error('Error: build directory not found.')
  console.error("Run 'pnpm build' first to generate build output.")
  process.exit(1)
}

const ENTRYPOINTS = [
  { name: 'uniku/uuid/v4', path: 'uuid/v4.mjs' },
  { name: 'uniku/uuid/v7', path: 'uuid/v7.mjs' },
  { name: 'uniku/ulid', path: 'ulid/ulid.mjs' },
  { name: 'uniku/cuid2', path: 'cuid2/cuid2.mjs' },
  { name: 'uniku/nanoid', path: 'nanoid/nanoid.mjs' },
] as const

type BundleSize = {
  name: string
  bytes: number
  hasExternal: boolean
}

/**
 * Parse import statements from code and return resolved paths to local .mjs files.
 * Skips external dependencies (e.g., @noble/hashes).
 */
function parseImports(code: string, baseDir: string): string[] {
  // Handle both minified (from"...") and non-minified (from "...") imports
  const importRegex = /from\s*["']([^"']+\.mjs)["']/g
  const imports: string[] = []
  for (const match of code.matchAll(importRegex)) {
    const importPath = match[1]
    // Skip external packages (start with @ or don't start with . or /)
    if (!importPath.startsWith('@') && (importPath.startsWith('.') || importPath.startsWith('/'))) {
      imports.push(resolve(baseDir, importPath))
    }
  }
  return imports
}

/**
 * Recursively collect all local dependencies for an entrypoint.
 * Returns a Set of absolute paths including the entrypoint itself.
 */
function collectDependencies(entryPath: string, visited: Set<string> = new Set()): Set<string> {
  if (visited.has(entryPath)) return visited
  if (!existsSync(entryPath)) return visited

  visited.add(entryPath)
  const code = readFileSync(entryPath, 'utf-8')
  const imports = parseImports(code, dirname(entryPath))

  for (const importPath of imports) {
    collectDependencies(importPath, visited)
  }

  return visited
}

/**
 * Check if an entrypoint has external dependencies (e.g., @noble/hashes).
 */
function hasExternalDependencies(entryPath: string): boolean {
  const code = readFileSync(entryPath, 'utf-8')
  // Match imports from external packages (start with @ or are bare specifiers)
  // Handle both minified (from"...") and non-minified (from "...") imports
  const externalRegex = /from\s*["'](@[^"']+|[^./][^"']*)["']/g
  return externalRegex.test(code)
}

/**
 * Calculate the total gzipped size of an entrypoint including all its local dependencies.
 */
function calculateBundleSize(entryPath: string): BundleSize {
  const dependencies = collectDependencies(entryPath)
  let totalContent = ''

  for (const depPath of dependencies) {
    totalContent += readFileSync(depPath, 'utf-8')
  }

  const gzipped = gzipSync(totalContent, { level: 9 })

  return {
    name: '',
    bytes: gzipped.length,
    hasExternal: hasExternalDependencies(entryPath),
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

// Calculate sizes for all entrypoints
const sizes: BundleSize[] = []

for (const entry of ENTRYPOINTS) {
  const entryPath = resolve(BUILD_DIR, entry.path)
  if (!existsSync(entryPath)) {
    console.error(`Warning: Entrypoint not found: ${entry.path}`)
    continue
  }

  const size = calculateBundleSize(entryPath)
  size.name = entry.name
  sizes.push(size)
}

if (sizes.length === 0) {
  console.error('Error: No entrypoints found in build directory.')
  process.exit(1)
}

// Build markdown table
function buildMarkdownTable(rows: BundleSize[]): string {
  const lines: string[] = []
  lines.push('| Import | Minified + gzipped |')
  lines.push('|--------|-------------------:|')
  for (const row of rows) {
    const sizeStr = formatBytes(row.bytes) + (row.hasExternal ? '*' : '')
    lines.push(`| \`${row.name}\` | ${sizeStr} |`)
  }
  return lines.join('\n')
}

// Build ASCII table for terminal
function buildAsciiTable(rows: BundleSize[]): string {
  const col1Width = Math.max('Import'.length, ...rows.map((r) => r.name.length)) + 2
  const col2Width =
    Math.max('Minified + gzipped'.length, ...rows.map((r) => formatBytes(r.bytes).length + (r.hasExternal ? 1 : 0))) + 2

  const lines: string[] = []

  // Top border
  lines.push(`\x1b[0m┌${'─'.repeat(col1Width)}┬${'─'.repeat(col2Width)}┐`)

  // Header
  lines.push(
    `│\x1b[1m${padCenter('Import', col1Width)}\x1b[0m│\x1b[1m${padCenter('Minified + gzipped', col2Width)}\x1b[0m│`,
  )

  // Header separator
  lines.push(`├${'─'.repeat(col1Width)}┼${'─'.repeat(col2Width)}┤`)

  // Rows
  for (const row of rows) {
    const sizeStr = formatBytes(row.bytes) + (row.hasExternal ? '*' : '')
    const coloredSize = `\x1b[32m${sizeStr}\x1b[0m`
    lines.push(`│ ${row.name.padEnd(col1Width - 2)} │ ${padWithAnsi(coloredSize, col2Width - 2)} │`)
  }

  // Bottom border
  lines.push(`└${'─'.repeat(col1Width)}┴${'─'.repeat(col2Width)}┘`)

  return lines.join('\n')
}

function padCenter(str: string, width: number): string {
  const padding = width - str.length
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + str + ' '.repeat(right)
}

function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require control characters
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function padWithAnsi(str: string, width: number): string {
  const visibleLength = stripAnsi(str).length
  const padding = Math.max(0, width - visibleLength)
  return str + ' '.repeat(padding)
}

// Check if any entrypoint has external dependencies
const hasAnyExternal = sizes.some((s) => s.hasExternal)

// Output
if (isCI) {
  console.log('## Bundle Impact\n')
  console.log(buildMarkdownTable(sizes))
  if (hasAnyExternal) {
    console.log('\n*Excludes external dependencies (e.g., @noble/hashes)')
  }
} else {
  console.log('\x1b[1;36m## Bundle Impact\x1b[0m\n')
  console.log(buildAsciiTable(sizes))
  if (hasAnyExternal) {
    console.log('\n\x1b[33m*Excludes external dependencies (e.g., @noble/hashes)\x1b[0m')
  }
}
