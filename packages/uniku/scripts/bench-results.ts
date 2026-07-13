import { readFileSync } from 'node:fs'

export type Benchmark = {
  name: string
  rank: number
  hz: number
  rme: number
  /** Robust 95%-style relative dispersion across repetitions in one CI action. */
  withinActionRme?: number
  /** Robust 95%-style relative dispersion across historical CI actions. */
  crossActionRme?: number
}

export type BenchGroup = {
  fullName: string
  benchmarks: Benchmark[]
}

export type BenchFile = {
  filepath: string
  groups: BenchGroup[]
}

export type BenchmarkSnapshot = {
  files: BenchFile[]
}

/**
 * A benchmark result may retain individual run snapshots. `files` is always
 * the median aggregate used by existing summary and comparison consumers.
 */
export type BenchResults = BenchmarkSnapshot & {
  history?: BenchmarkSnapshot[]
}

export type ComparisonStatus = 'regression' | 'improvement' | 'neutral' | 'reference' | 'new' | 'removed'

export type ComparisonRow = {
  key: string
  baselineOps: string
  currentOps: string
  change: number
  combinedRme: number
  status: ComparisonStatus
  /**
   * Whether this benchmark measures uniku's own code. Third-party reference
   * benchmarks (the `npm`/`regex` competitors) are `false` — their run-to-run
   * swings are not regressions we can introduce or fix, so they never gate.
   */
  owned: boolean
}

/**
 * Leaf benchmark names that measure third-party code rather than uniku's own.
 * Their throughput is outside our control and is the noisiest part of the
 * suite, so they are reported for context but never classified as a regression.
 */
const REFERENCE_BENCH_NAMES = new Set(['npm', 'regex'])

/**
 * A benchmark is "owned" (subject to regression gating) unless its leaf name is
 * a known third-party reference competitor. Keys are `<group> > <leaf>`.
 */
export function isOwnedBenchmark(key: string): boolean {
  const leaf = key.split(' > ').at(-1) ?? key
  return !REFERENCE_BENCH_NAMES.has(leaf)
}

/**
 * Default multiplier applied to a benchmark's combined RME when deciding whether
 * a change is real. A single run's RME understates true cross-run variance on
 * shared CI runners, so we require a change to clear ~2 standard deviations of
 * measurement noise (not just 1) before calling it a regression or improvement.
 */
export const DEFAULT_NOISE_MULTIPLIER = 2

export function loadBenchResults(path: string): BenchResults {
  return JSON.parse(readFileSync(path, 'utf-8')) as BenchResults
}

/** Aggregate independent benchmark executions using the median for each row. */
export function aggregateBenchResults(results: BenchResults[]): BenchResults {
  if (results.length === 0) {
    throw new Error('At least one benchmark result is required to aggregate')
  }

  const history = results.flatMap((result) => result.history ?? [toSnapshot(result)])
  return { ...aggregateBenchmarkSnapshots(history, 'withinActionRme'), history }
}

/**
 * Add an action-level aggregate to a rolling baseline. Keeping action
 * aggregates avoids treating repeat samples from the same shared runner as
 * independent cross-run evidence.
 */
export function mergeBenchmarkHistory(
  baseline: BenchResults | undefined,
  current: BenchResults,
  maxHistory: number,
): BenchResults {
  if (!Number.isInteger(maxHistory) || maxHistory < 1) {
    throw new Error('maxHistory must be a positive integer')
  }

  const baselineHistory = baseline ? (baseline.history ?? [toSnapshot(baseline)]) : []
  const currentHistory = current.history ?? [toSnapshot(current)]
  const currentAction = aggregateBenchmarkSnapshots(currentHistory, 'withinActionRme')
  const history = [...baselineHistory, currentAction].slice(-maxHistory)
  return { ...aggregateBenchmarkSnapshots(history, 'crossActionRme'), history }
}

function toSnapshot(result: BenchmarkSnapshot): BenchmarkSnapshot {
  return { files: result.files }
}

function aggregateBenchmarkSnapshots(
  snapshots: BenchmarkSnapshot[],
  dispersionField: 'withinActionRme' | 'crossActionRme',
): BenchmarkSnapshot {
  const first = snapshots[0]
  const benchmarksBySnapshot = snapshots.map(collectBenchmarks)
  assertMatchingBenchmarkMatrices(benchmarksBySnapshot)

  return {
    files: first.files.map((file) => ({
      ...file,
      groups: file.groups.map((group) => {
        const groupName = normalizeGroupName(file, group)
        return {
          ...group,
          benchmarks: group.benchmarks.map((benchmark) => {
            const key = `${groupName} > ${benchmark.name}`
            const matches = benchmarksBySnapshot.map((benchmarks) => benchmarks.get(key)!)
            const hzs = matches.map((candidate) => candidate.hz)
            const { withinActionRme: _withinActionRme, crossActionRme: _crossActionRme, ...baseBenchmark } = benchmark
            return {
              ...baseBenchmark,
              hz: median(hzs),
              rme: median(matches.map((candidate) => candidate.rme ?? 0)),
              [dispersionField]: robustRelativeRme(hzs),
            }
          }),
        }
      }),
    })),
  }
}

function assertMatchingBenchmarkMatrices(benchmarksBySnapshot: Map<string, Benchmark>[]): void {
  const expected = new Set(benchmarksBySnapshot[0].keys())

  for (const [index, benchmarks] of benchmarksBySnapshot.entries()) {
    const missing = [...expected].filter((key) => !benchmarks.has(key))
    const extra = [...benchmarks.keys()].filter((key) => !expected.has(key))
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Benchmark matrix mismatch in snapshot ${index + 1}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
      )
    }
  }
}

function robustRelativeRme(values: number[]): number {
  if (values.length < 2) return 0

  const center = median(values)
  if (center === 0) return 0

  const medianAbsoluteDeviation = median(values.map((value) => Math.abs(value - center)))
  // Scale a normal-distribution MAD into a two-sided 95% relative band. Unlike
  // a plain standard deviation, this stays stable if one shared runner is noisy.
  return (medianAbsoluteDeviation / center) * 1.4826 * 1.96 * 100
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
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
    /** Multiplier on combined RME for the significance band. Defaults to {@link DEFAULT_NOISE_MULTIPLIER}. */
    noiseMultiplier?: number
  },
): {
  rows: ComparisonRow[]
  hasRegression: boolean
  regressions: string[]
} {
  const baseline = collectBenchmarks(baselineResults)
  const current = collectBenchmarks(currentResults)
  const noiseMultiplier = options.noiseMultiplier ?? DEFAULT_NOISE_MULTIPLIER

  const rows: ComparisonRow[] = []
  const regressions: string[] = []
  let hasRegression = false

  for (const [key, curr] of current) {
    const owned = isOwnedBenchmark(key)
    const base = baseline.get(key)
    if (!base) {
      rows.push({
        key,
        baselineOps: 'N/A',
        currentOps: formatOps(curr.hz),
        change: 0,
        combinedRme: 0,
        status: 'new',
        owned,
      })
      continue
    }

    const change = (curr.hz - base.hz) / base.hz
    const combinedRme = (benchmarkUncertainty(base) + benchmarkUncertainty(curr)) / 100
    const noiseBand = noiseMultiplier * combinedRme
    const regressionLimit = Math.max(options.regressionThreshold, noiseBand)
    const improvementLimit = Math.max(options.improvementThreshold, noiseBand)

    let status: ComparisonStatus
    if (!owned) {
      // Third-party reference benchmark: report its change for context, but it
      // can never be a uniku regression, so it never gates.
      status = 'reference'
    } else if (change < -regressionLimit) {
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
      owned,
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
        owned: isOwnedBenchmark(key),
      })
    }
  }

  rows.sort((a, b) => {
    const statusOrder: Record<ComparisonStatus, number> = {
      regression: 0,
      improvement: 1,
      neutral: 2,
      reference: 3,
      new: 4,
      removed: 5,
    }
    const orderDiff = statusOrder[a.status] - statusOrder[b.status]
    if (orderDiff !== 0) return orderDiff
    return Math.abs(b.change) - Math.abs(a.change)
  })

  return { rows, hasRegression, regressions }
}

function benchmarkUncertainty(benchmark: Benchmark): number {
  return Math.max(benchmark.rme ?? 0, benchmark.withinActionRme ?? 0, benchmark.crossActionRme ?? 0)
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
