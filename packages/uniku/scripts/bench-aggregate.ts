#!/usr/bin/env bun
import { writeFileSync } from 'node:fs'
import { aggregateBenchResults, loadBenchResults } from './bench-results'

const [outputPath, ...inputPaths] = process.argv.slice(2)

if (!outputPath || inputPaths.length === 0) {
  console.error('Usage: bun scripts/bench-aggregate.ts <output.json> <run-1.json> [run-2.json ...]')
  process.exit(2)
}

const aggregate = aggregateBenchResults(inputPaths.map(loadBenchResults))
writeFileSync(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`)
