#!/usr/bin/env bun

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Benchmark, BenchResults } from './bench-results'

export const BENCHMARK_ORDERS = ['uniku-first', 'reference-first'] as const
export type BenchmarkOrder = (typeof BENCHMARK_ORDERS)[number]
export type BenchmarkImplementation = 'uniku' | 'reference'

export function implementationsForOrder(order: BenchmarkOrder): BenchmarkImplementation[] {
  return order === 'uniku-first' ? ['uniku', 'reference'] : ['reference', 'uniku']
}

export function mergeImplementationResults(results: BenchResults[]): BenchResults {
  if (results.length !== 2) {
    throw new Error('Exactly two isolated implementation results are required')
  }

  const [first, second] = results
  if (first.files.length !== second.files.length) {
    throw new Error('Isolated benchmark files do not match')
  }

  return {
    files: first.files.map((file, fileIndex) => {
      const otherFile = second.files[fileIndex]
      if (file.filepath !== otherFile.filepath || file.groups.length !== otherFile.groups.length) {
        throw new Error('Isolated benchmark files do not match')
      }

      return {
        ...file,
        groups: file.groups.map((group, groupIndex) => {
          const otherGroup = otherFile.groups[groupIndex]
          if (group.fullName !== otherGroup.fullName) {
            throw new Error('Isolated benchmark groups do not match')
          }

          const benchmarks = [...group.benchmarks, ...otherGroup.benchmarks]
          if (benchmarks.length !== 2 || new Set(benchmarks.map(({ name }) => name)).size !== 2) {
            throw new Error(`Expected two distinct implementations for ${group.fullName}`)
          }

          return { ...group, benchmarks: rankBenchmarks(benchmarks) }
        }),
      }
    }),
  }
}

function rankBenchmarks(benchmarks: Benchmark[]): Benchmark[] {
  const ranked = [...benchmarks].sort((left, right) => right.hz - left.hz)
  const ranks = new Map(ranked.map(({ name }, index) => [name, index + 1]))
  return benchmarks.map((benchmark) => ({ ...benchmark, rank: ranks.get(benchmark.name)! }))
}

async function run(): Promise<void> {
  const order = process.env.UNIKU_BENCH_ORDER ?? 'uniku-first'
  if (!BENCHMARK_ORDERS.includes(order as BenchmarkOrder)) {
    throw new Error(`UNIKU_BENCH_ORDER must be one of: ${BENCHMARK_ORDERS.join(', ')}`)
  }

  const packageRoot = resolve(import.meta.dir, '..')
  const outputPath = resolve(packageRoot, 'bench-results.json')
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'uniku-bench-'))

  try {
    const results: BenchResults[] = []
    for (const implementation of implementationsForOrder(order as BenchmarkOrder)) {
      const isolatedOutput = join(temporaryDirectory, `${implementation}.json`)
      const process = Bun.spawn(
        [
          'pnpm',
          'exec',
          'vitest',
          'bench',
          './__tests__/bench/compat.bench.ts',
          '--run',
          '--project',
          'unit',
          '--outputJson',
          isolatedOutput,
        ],
        {
          cwd: packageRoot,
          env: { ...Bun.env, UNIKU_BENCH_IMPLEMENTATION: implementation },
          stdout: 'inherit',
          stderr: 'inherit',
        },
      )

      const exitCode = await process.exited
      if (exitCode !== 0) {
        throw new Error(`${implementation} benchmark process exited with code ${exitCode}`)
      }
      results.push(JSON.parse(readFileSync(isolatedOutput, 'utf8')) as BenchResults)
    }

    writeFileSync(outputPath, `${JSON.stringify(mergeImplementationResults(results), null, 2)}\n`)
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  await run()
}
