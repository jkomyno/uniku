#!/usr/bin/env bun
import { existsSync, writeFileSync } from 'node:fs'
import { loadBenchResults, mergeBenchmarkHistory } from './bench-results'

const [outputPath, baselinePath, currentPath, maxHistoryArg] = process.argv.slice(2)

if (!outputPath || !baselinePath || !currentPath) {
  console.error('Usage: bun scripts/bench-history.ts <output.json> <baseline.json> <current.json> [max-history]')
  process.exit(2)
}

const maxHistory = Number(maxHistoryArg ?? 15)
const baseline = existsSync(baselinePath) ? loadBenchResults(baselinePath) : undefined
const current = loadBenchResults(currentPath)
const merged = mergeBenchmarkHistory(baseline, current, maxHistory)
writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`)
