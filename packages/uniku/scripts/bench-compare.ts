#!/usr/bin/env bun
/**
 * Benchmark Comparison Script
 *
 * Compares current benchmark results against a baseline and detects regressions.
 * Outputs a markdown comparison table and exits with error if an RME-significant
 * regression exceeds the configured threshold.
 *
 * Usage:
 *   pnpm bench:compare           # Compare against baseline from gh-benchmarks branch
 *   bun scripts/bench-compare.ts baseline.json bench-results.json
 *
 * Output:
 *   - In CI (CI=true): Markdown table for GitHub PR comments, exits 1 on significant regression,
 *     exits 2 on infrastructure/parsing failures
 *   - In terminal: Formatted table with colors and summary
 *
 * @module
 */

import { resolve } from 'node:path'
import { type ComparisonRow, compareBenchResults, loadBenchResults } from './bench-results'

const isCI = Bun.env.CI === 'true'

// Thresholds for classification
const REGRESSION_THRESHOLD = 0.1 // 10% slower = regression
const IMPROVEMENT_THRESHOLD = 0.1 // 10% faster = improvement

function compare(
  baselinePath: string,
  currentPath: string,
): {
  rows: ComparisonRow[]
  hasRegression: boolean
  regressions: string[]
} {
  return compareBenchResults(loadBenchResults(baselinePath), loadBenchResults(currentPath), {
    regressionThreshold: REGRESSION_THRESHOLD,
    improvementThreshold: IMPROVEMENT_THRESHOLD,
  })
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function formatChangeParts(row: ComparisonRow): { percent: string; rme: string } {
  return {
    percent: (row.change * 100).toFixed(1),
    rme: row.combinedRme > 0 ? ` (+/-${(row.combinedRme * 100).toFixed(1)}% RME)` : '',
  }
}

function formatChangeMarkdown(row: ComparisonRow): string {
  const { percent, rme } = formatChangeParts(row)
  switch (row.status) {
    case 'regression':
      return `🔴 ${percent}%${rme}`
    case 'improvement':
      return `🟢 +${percent}%${rme}`
    case 'neutral':
      return `⚪ ${row.change >= 0 ? '+' : ''}${percent}%${rme}`
    case 'new':
      return '🆕 new'
    case 'removed':
      return '🗑️ removed'
  }
}

function formatChangeAnsi(row: ComparisonRow): string {
  const { percent, rme } = formatChangeParts(row)
  switch (row.status) {
    case 'regression':
      return `\x1b[31m${percent}%${rme}\x1b[0m` // Red
    case 'improvement':
      return `\x1b[32m+${percent}%${rme}\x1b[0m` // Green
    case 'neutral':
      return `\x1b[33m${row.change >= 0 ? '+' : ''}${percent}%${rme}\x1b[0m` // Yellow
    case 'new':
      return '\x1b[36mnew\x1b[0m' // Cyan
    case 'removed':
      return '\x1b[90mremoved\x1b[0m' // Gray
  }
}

function buildMarkdownTable(rows: ComparisonRow[]): string {
  const lines: string[] = []
  lines.push('| Benchmark | Baseline | Current | Change |')
  lines.push('|-----------|----------|---------|--------|')

  for (const row of rows) {
    lines.push(`| ${row.key} | ${row.baselineOps} ops/s | ${row.currentOps} ops/s | ${formatChangeMarkdown(row)} |`)
  }

  return lines.join('\n')
}

// Main
const baselinePath = process.argv[2] || resolve(import.meta.dir, '../baseline.json')
const currentPath = process.argv[3] || resolve(import.meta.dir, '../bench-results.json')

let rows: ComparisonRow[]
let hasRegression: boolean
let regressions: string[]

try {
  ;({ rows, hasRegression, regressions } = compare(baselinePath, currentPath))
} catch (error) {
  if (isMissingFileError(error)) {
    if ((error as NodeJS.ErrnoException).path === baselinePath) {
      if (isCI) {
        console.log('No baseline found. First run will establish baseline.')
      } else {
        console.log('\x1b[33mNo baseline found.\x1b[0m')
        console.log('Run `git fetch origin gh-benchmarks` to fetch baseline, or')
        console.log('run benchmarks on main to establish initial baseline.')
      }
      process.exit(0)
    }

    console.error('Error: Current benchmark results not found.')
    console.error("Run 'pnpm bench' or 'pnpm bench:compat' first.")
  } else {
    console.error('Error: Failed to parse benchmark results.')
  }
  process.exit(2)
}

if (isCI) {
  // Output markdown for GitHub Actions
  console.log(buildMarkdownTable(rows))

  if (hasRegression) {
    console.error('\n❌ Performance regression detected!')
    for (const r of regressions) {
      console.error(`  - ${r}`)
    }
    process.exit(1)
  }
} else {
  // Terminal output with colors
  console.log('\n\x1b[1;36m## Benchmark Comparison\x1b[0m\n')

  console.log(
    Bun.inspect.table(
      rows.map((row) => ({
        Benchmark: row.key,
        Baseline: `${row.baselineOps} ops/s`,
        Current: `${row.currentOps} ops/s`,
        Change: formatChangeAnsi(row),
      })),
      { colors: true },
    ),
  )

  if (hasRegression) {
    console.log('\n\x1b[1;31m⚠️  Performance regressions detected:\x1b[0m')
    for (const r of regressions) {
      console.log(`  \x1b[31m•\x1b[0m ${r}`)
    }
    console.log()
  } else {
    console.log('\n\x1b[1;32m✅ No performance regressions detected\x1b[0m\n')
  }
}
