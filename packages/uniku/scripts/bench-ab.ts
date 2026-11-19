#!/usr/bin/env bun
/**
 * Same-runner A/B benchmark of uniku against another checkout.
 *
 * Runs only the uniku side of compat.bench.ts, once per checkout per repetition,
 * alternating which checkout goes first. Each checkout runs its own bench file
 * against its own build, so both packages must be built first. Writes the
 * per-row medians of each side to `base.json` and `head.json`, which
 * bench-compare.ts reads as baseline and current.
 *
 * Usage:
 *   bun scripts/bench-ab.ts <base-package-dir> <output-dir>
 *
 * `UNIKU_BENCH_AB_REPETITIONS` sets the repetition count (default 4).
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runCompatBenchProcess } from './bench-compat'
import { aggregateBenchResults, type BenchResults } from './bench-results'

export const AB_SIDES = ['base', 'head'] as const
export type AbSide = (typeof AB_SIDES)[number]

const DEFAULT_REPETITIONS = 4

/**
 * Launch order for each repetition. Repetitions alternate which side runs
 * first, so an even count gives both sides the first slot equally often.
 */
export function planAbRuns(repetitions: number): AbSide[][] {
  if (!Number.isInteger(repetitions) || repetitions < 1) {
    throw new Error('Repetitions must be a positive integer')
  }
  return Array.from({ length: repetitions }, (_, index) => (index % 2 === 0 ? ['base', 'head'] : ['head', 'base']))
}

async function run(): Promise<void> {
  const [baseArg, outputArg] = process.argv.slice(2)
  if (!baseArg || !outputArg) {
    console.error('Usage: bun scripts/bench-ab.ts <base-package-dir> <output-dir>')
    process.exit(2)
  }

  const packageRoots = {
    base: resolve(baseArg),
    head: resolve(import.meta.dir, '..'),
  } satisfies Record<AbSide, string>
  const outputDirectory = resolve(outputArg)
  const reportDirectory = join(outputDirectory, 'reports')
  mkdirSync(reportDirectory, { recursive: true })

  const runs = planAbRuns(Number(Bun.env.UNIKU_BENCH_AB_REPETITIONS ?? DEFAULT_REPETITIONS))
  const completed: { side: AbSide; result: BenchResults }[] = []
  for (const [repetition, order] of runs.entries()) {
    for (const side of order) {
      console.log(`\n## Repetition ${repetition + 1}/${runs.length}: ${side} (${packageRoots[side]})\n`)
      const reportPath = join(reportDirectory, `${side}-${repetition + 1}.json`)
      const result = await runCompatBenchProcess({
        packageRoot: packageRoots[side],
        implementation: 'uniku',
        reportPath,
      })
      completed.push({ side, result })
    }
  }

  for (const side of AB_SIDES) {
    const aggregate = aggregateBenchResults(completed.filter((run) => run.side === side).map(({ result }) => result))
    const outputPath = join(outputDirectory, `${side}.json`)
    writeFileSync(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`)
    console.log(`Wrote ${outputPath}`)
  }
}

if (import.meta.main) {
  await run()
}
