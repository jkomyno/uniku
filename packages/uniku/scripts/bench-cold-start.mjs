#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

import { COLD_START_ENTRYPOINTS } from './cold-start-entrypoints.mjs'

const DEFAULT_SAMPLES = 25
const sampleCount = Number(process.env.UNIKU_COLD_START_SAMPLES ?? DEFAULT_SAMPLES)

if (!Number.isInteger(sampleCount) || sampleCount < 1) {
  throw new Error('UNIKU_COLD_START_SAMPLES must be a positive integer')
}

function percentile(values, p) {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)
  return sorted[index]
}

function formatMs(value) {
  return `${value.toFixed(1)} ms`
}

console.log('### Cold Start (Node)\n')
console.log('| Generator | Process to exit (median / p95) | Import + first ID (median / p95) |')
console.log('|-----------|--------------------------------|----------------------------------|')

for (const { entrypoint } of COLD_START_ENTRYPOINTS) {
  const processToExit = []
  const importAndFirstId = []
  for (let index = 0; index < sampleCount; index += 1) {
    const started = performance.now()
    const result = spawnSync(process.execPath, [new URL('./cold-start-probe.mjs', import.meta.url).pathname, entrypoint], {
      encoding: 'utf8',
    })
    processToExit.push(performance.now() - started)
    if (result.status !== 0) throw new Error(result.stderr || `Cold-start probe failed for ${entrypoint}`)
    importAndFirstId.push(JSON.parse(result.stdout).importAndFirstIdMs)
  }
  const processSummary = `${formatMs(percentile(processToExit, 0.5))} / ${formatMs(percentile(processToExit, 0.95))}`
  const importSummary = `${formatMs(percentile(importAndFirstId, 0.5))} / ${formatMs(percentile(importAndFirstId, 0.95))}`
  console.log(`| ${entrypoint} | ${processSummary} | ${importSummary} |`)
}
