import { readFileSync } from 'node:fs'

export type Benchmark = {
  name: string
  rank: number
  hz: number
  rme: number
}

export type BenchGroup = {
  fullName: string
  benchmarks: Benchmark[]
}

export type BenchFile = {
  filepath: string
  groups: BenchGroup[]
}

export type BenchResults = {
  files: BenchFile[]
}

export type ComparisonStatus = 'regression' | 'improvement' | 'neutral' | 'new' | 'removed'

export type ComparisonRow = {
  key: string
  baselineOps: string
  currentOps: string
  change: number
  combinedRme: number
  status: ComparisonStatus
}

export function loadBenchResults(path: string): BenchResults {
  return JSON.parse(readFileSync(path, 'utf-8')) as BenchResults
}

export function collectBenchGroups(results: BenchResults): BenchGroup[] {
  const groupsByName = new Map<string, Map<string, Benchmark>>()

  for (const file of results.files) {
    for (const group of file.groups) {
      const groupName = normalizeGroupName(file, group)
      let benchmarks = groupsByName.get(groupName)
      if (!benchmarks) {
        benchmarks = new Map()
        groupsByName.set(groupName, benchmarks)
      }

      for (const benchmark of group.benchmarks) {
        benchmarks.set(benchmark.name, benchmark)
      }
    }
  }

  return [...groupsByName.entries()].map(([fullName, benchmarks]) => ({
    fullName,
    benchmarks: [...benchmarks.values()],
  }))
}

export function collectBenchmarks(results: BenchResults): Map<string, Benchmark> {
  const benchmarks = new Map<string, Benchmark>()

  for (const file of results.files) {
    for (const group of file.groups) {
      const groupName = normalizeGroupName(file, group)
      for (const benchmark of group.benchmarks) {
        benchmarks.set(`${groupName} > ${benchmark.name}`, benchmark)
      }
    }
  }

  return benchmarks
}

export function formatOps(hz: number): string {
  if (hz >= 1_000_000) {
    return `${(hz / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  } else if (hz >= 1_000) {
    return `${(hz / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return hz.toFixed(0)
}

export function compareBenchResults(
  baselineResults: BenchResults,
  currentResults: BenchResults,
  options: {
    regressionThreshold: number
    improvementThreshold: number
  },
): {
  rows: ComparisonRow[]
  hasRegression: boolean
  regressions: string[]
} {
  const baseline = collectBenchmarks(baselineResults)
  const current = collectBenchmarks(currentResults)

  const rows: ComparisonRow[] = []
  const regressions: string[] = []
  let hasRegression = false

  for (const [key, curr] of current) {
    const base = baseline.get(key)
    if (!base) {
      rows.push({
        key,
        baselineOps: 'N/A',
        currentOps: formatOps(curr.hz),
        change: 0,
        combinedRme: 0,
        status: 'new',
      })
      continue
    }

    const change = (curr.hz - base.hz) / base.hz
    const combinedRme = ((base.rme ?? 0) + (curr.rme ?? 0)) / 100
    const regressionLimit = Math.max(options.regressionThreshold, combinedRme)
    const improvementLimit = Math.max(options.improvementThreshold, combinedRme)

    let status: ComparisonStatus
    if (change < -regressionLimit) {
      status = 'regression'
      hasRegression = true
      regressions.push(
        `${key}: ${(change * 100).toFixed(1)}% (${formatOps(base.hz)} -> ${formatOps(curr.hz)} ops/s, +/-${(combinedRme * 100).toFixed(1)}% combined RME)`,
      )
    } else if (change > improvementLimit) {
      status = 'improvement'
    } else {
      status = 'neutral'
    }

    rows.push({
      key,
      baselineOps: formatOps(base.hz),
      currentOps: formatOps(curr.hz),
      change,
      combinedRme,
      status,
    })
  }

  for (const [key, base] of baseline) {
    if (!current.has(key)) {
      rows.push({
        key,
        baselineOps: formatOps(base.hz),
        currentOps: 'N/A',
        change: 0,
        combinedRme: 0,
        status: 'removed',
      })
    }
  }

  rows.sort((a, b) => {
    const statusOrder: Record<ComparisonStatus, number> = {
      regression: 0,
      improvement: 1,
      neutral: 2,
      new: 3,
      removed: 4,
    }
    const orderDiff = statusOrder[a.status] - statusOrder[b.status]
    if (orderDiff !== 0) return orderDiff
    return Math.abs(b.change) - Math.abs(a.change)
  })

  return { rows, hasRegression, regressions }
}

function normalizeGroupName(file: BenchFile, group: BenchGroup): string {
  const fileLabel = normalizeBenchFilepath(file.filepath)
  const fullName = group.fullName.replaceAll('\\', '/')
  const basename = fileLabel.split('/').at(-1) ?? fileLabel

  if (fullName === fileLabel || fullName.startsWith(`${fileLabel} > `)) {
    return fullName
  }
  if (fullName === basename || fullName.startsWith(`${basename} > `)) {
    return `${fileLabel}${fullName.slice(basename.length)}`
  }
  return `${fileLabel} > ${fullName}`
}

function normalizeBenchFilepath(filepath: string): string {
  const normalized = filepath.replaceAll('\\', '/')
  const benchRoot = '/__tests__/bench/'
  const benchRootIndex = normalized.lastIndexOf(benchRoot)
  if (benchRootIndex >= 0) {
    return normalized.slice(benchRootIndex + 1)
  }
  return normalized.split('/').at(-1) ?? normalized
}
