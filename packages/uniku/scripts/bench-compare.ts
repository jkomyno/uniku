#!/usr/bin/env bun
/**
 * Benchmark Comparison Script
 *
 * Compares current benchmark results against a baseline and detects regressions.
 * Outputs a markdown comparison table and exits with error if regression >10%.
 *
 * Usage:
 *   pnpm bench:compare           # Compare against baseline from gh-benchmarks branch
 *   bun scripts/bench-compare.ts baseline.json bench-results.json
 *
 * Output:
 *   - In CI (CI=true): Markdown table for GitHub PR comments, exits 1 on regression
 *   - In terminal: Formatted table with colors and summary
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const isCI = Bun.env.CI === 'true'

// Thresholds for classification
const REGRESSION_THRESHOLD = 0.1 // 10% slower = regression
const IMPROVEMENT_THRESHOLD = 0.1 // 10% faster = improvement

type Benchmark = {
  name: string
  rank: number
  hz: number
  rme: number // Relative margin of error (%)
}

type BenchGroup = {
  fullName: string
  benchmarks: Benchmark[]
}

type BenchFile = {
  filepath: string
  groups: BenchGroup[]
}

type BenchResults = {
  files: BenchFile[]
}

function loadResults(path: string): Map<string, Benchmark> {
  const data: BenchResults = JSON.parse(readFileSync(path, 'utf-8'))
  const map = new Map<string, Benchmark>()

  // Use only first file entry (matches bench-summary.ts behavior)
  // Vitest may produce duplicate file entries; we use the first one
  const file = data.files[0]
  if (!file) return map

  for (const group of file.groups) {
    for (const bench of group.benchmarks) {
      // Use full path as key: "Group Name > benchmark name"
      const key = `${group.fullName} > ${bench.name}`
      map.set(key, bench)
    }
  }
  return map
}

function formatOps(hz: number): string {
  if (hz >= 1_000_000) {
    return `${(hz / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  } else if (hz >= 1_000) {
    return `${(hz / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return hz.toFixed(0)
}

type ComparisonRow = {
  key: string
  baselineOps: string
  currentOps: string
  change: number
  status: 'regression' | 'improvement' | 'neutral' | 'new' | 'removed'
}

function compare(
  baselinePath: string,
  currentPath: string,
): {
  rows: ComparisonRow[]
  hasRegression: boolean
  regressions: string[]
} {
  const baseline = loadResults(baselinePath)
  const current = loadResults(currentPath)

  const rows: ComparisonRow[] = []
  const regressions: string[] = []
  let hasRegression = false

  // Compare current benchmarks against baseline
  for (const [key, curr] of current) {
    const base = baseline.get(key)
    if (!base) {
      rows.push({
        key,
        baselineOps: 'N/A',
        currentOps: formatOps(curr.hz),
        change: 0,
        status: 'new',
      })
      continue
    }

    const change = (curr.hz - base.hz) / base.hz

    let status: ComparisonRow['status']
    if (change < -REGRESSION_THRESHOLD) {
      status = 'regression'
      hasRegression = true
      regressions.push(`${key}: ${(change * 100).toFixed(1)}% (${formatOps(base.hz)} → ${formatOps(curr.hz)} ops/s)`)
    } else if (change > IMPROVEMENT_THRESHOLD) {
      status = 'improvement'
    } else {
      status = 'neutral'
    }

    rows.push({
      key,
      baselineOps: formatOps(base.hz),
      currentOps: formatOps(curr.hz),
      change,
      status,
    })
  }

  // Check for removed benchmarks
  for (const [key, base] of baseline) {
    if (!current.has(key)) {
      rows.push({
        key,
        baselineOps: formatOps(base.hz),
        currentOps: 'N/A',
        change: 0,
        status: 'removed',
      })
    }
  }

  // Sort: regressions first, then improvements, then neutral, then new/removed
  const statusOrder = { regression: 0, improvement: 1, neutral: 2, new: 3, removed: 4 }
  rows.sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status]
    if (orderDiff !== 0) return orderDiff
    // Within same status, sort by change magnitude (largest first)
    return Math.abs(b.change) - Math.abs(a.change)
  })

  return { rows, hasRegression, regressions }
}

function formatChangeMarkdown(row: ComparisonRow): string {
  const percent = (row.change * 100).toFixed(1)
  switch (row.status) {
    case 'regression':
      return `🔴 ${percent}%`
    case 'improvement':
      return `🟢 +${percent}%`
    case 'neutral':
      return `⚪ ${row.change >= 0 ? '+' : ''}${percent}%`
    case 'new':
      return '🆕 new'
    case 'removed':
      return '🗑️ removed'
  }
}

function formatChangeAnsi(row: ComparisonRow): string {
  const percent = (row.change * 100).toFixed(1)
  switch (row.status) {
    case 'regression':
      return `\x1b[31m${percent}%\x1b[0m` // Red
    case 'improvement':
      return `\x1b[32m+${percent}%\x1b[0m` // Green
    case 'neutral':
      return `\x1b[33m${row.change >= 0 ? '+' : ''}${percent}%\x1b[0m` // Yellow
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

if (!existsSync(baselinePath)) {
  if (isCI) {
    console.log('No baseline found. First run will establish baseline.')
  } else {
    console.log('\x1b[33mNo baseline found.\x1b[0m')
    console.log('Run `git fetch origin gh-benchmarks` to fetch baseline, or')
    console.log('run benchmarks on main to establish initial baseline.')
  }
  process.exit(0)
}

if (!existsSync(currentPath)) {
  console.error('Error: Current benchmark results not found.')
  console.error("Run 'pnpm bench' or 'pnpm bench:compat' first.")
  process.exit(1)
}

const { rows, hasRegression, regressions } = compare(baselinePath, currentPath)

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
