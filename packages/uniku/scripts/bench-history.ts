#!/usr/bin/env bun
import { writeFileSync } from 'node:fs'
import { loadBenchResults, mergeBenchmarkHistory } from './bench-results'

const [outputPath, baselinePath, currentPath, maxHistoryArg] = process.argv.slice(2)

if (!outputPath || !baselinePath || !currentPath) {
  console.error('Usage: bun scripts/bench-history.ts <output.json> <baseline.json> <current.json> [max-history]')
  process.exit(2)
}

const maxHistory = Number(maxHistoryArg ?? 15)
const baseline = loadOptionalBenchResults(baselinePath)
const current = loadBenchResults(currentPath)
const merged = mergeBenchmarkHistory(baseline, current, maxHistory)
writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`)

function loadOptionalBenchResults(path: string) {
  try {
    return loadBenchResults(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}
