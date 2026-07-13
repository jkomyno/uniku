import {
  aggregateBenchResults,
  type BenchResults,
  collectBenchGroups,
  collectBenchmarks,
  compareBenchResults,
  isOwnedBenchmark,
  mergeBenchmarkHistory,
} from '../../scripts/bench-results'

function bench(name: string, hz: number, rme: number) {
  return { name, hz, rme, rank: 1 }
}

describe('benchmark results helpers', () => {
  it('collects groups from every benchmark file', () => {
    const results: BenchResults = {
      files: [
        {
          filepath: '/repo/packages/uniku/__tests__/bench/id.bench.ts',
          groups: [
            {
              fullName: '__tests__/bench/id.bench.ts > ID Generation',
              benchmarks: [bench('uuidv4', 1_000, 1)],
            },
          ],
        },
        {
          filepath: '/repo/packages/uniku/__tests__/bench/compat.bench.ts',
          groups: [
            {
              fullName: '__tests__/bench/compat.bench.ts > Generation > UUID v4',
              benchmarks: [bench('uniku', 2_000, 1), bench('npm', 1_500, 1)],
            },
          ],
        },
      ],
    }

    expect(collectBenchGroups(results).map((group) => group.fullName)).toEqual([
      '__tests__/bench/id.bench.ts > ID Generation',
      '__tests__/bench/compat.bench.ts > Generation > UUID v4',
    ])
    expect([...collectBenchmarks(results).keys()]).toEqual([
      '__tests__/bench/id.bench.ts > ID Generation > uuidv4',
      '__tests__/bench/compat.bench.ts > Generation > UUID v4 > uniku',
      '__tests__/bench/compat.bench.ts > Generation > UUID v4 > npm',
    ])
  })

  it('treats regressions within combined RME as neutral runner noise', () => {
    const result = compareBenchResults(withSingleBench(1_000, 8), withSingleBench(900, 4), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.hasRegression).toBe(false)
    expect(result.rows[0]).toMatchObject({
      change: -0.1,
      combinedRme: 0.12,
      status: 'neutral',
    })
  })

  it('flags regressions that exceed both the threshold and combined RME', () => {
    const result = compareBenchResults(withSingleBench(1_000, 1), withSingleBench(850, 1), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.hasRegression).toBe(true)
    expect(result.rows[0]).toMatchObject({
      change: -0.15,
      combinedRme: 0.02,
      status: 'regression',
      owned: true,
    })
  })

  it('classifies uniku benchmarks as owned and npm/regex as reference', () => {
    expect(isOwnedBenchmark('compat.bench.ts > Generation > UUID v7 > uniku')).toBe(true)
    expect(isOwnedBenchmark('id.bench.ts > ID Generation > uuidv4')).toBe(true)
    expect(isOwnedBenchmark('compat.bench.ts > Generation > UUID v7 > npm')).toBe(false)
    expect(isOwnedBenchmark('compat.bench.ts > Validation > NanoID > regex')).toBe(false)
  })

  it('never gates on a third-party reference benchmark, even for a huge drop', () => {
    // Mirrors the real npm UUID v7 case: a ~90% swing on a competitor we do not control.
    const result = compareBenchResults(withCompatBench('npm', 2_800_000, 3), withCompatBench('npm', 262_900, 5), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.hasRegression).toBe(false)
    expect(result.regressions).toEqual([])
    expect(result.rows[0]).toMatchObject({ status: 'reference', owned: false })
  })

  it('absorbs an owned change that clears the threshold but sits within 2x combined RME', () => {
    // change -15%, combined RME 10%: a regression under the old 1x band, noise under 2x.
    const result = compareBenchResults(withCompatBench('uniku', 1_000, 5), withCompatBench('uniku', 850, 5), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.hasRegression).toBe(false)
    expect(result.rows[0]).toMatchObject({ change: -0.15, combinedRme: 0.1, status: 'neutral', owned: true })
  })

  it('still flags an owned regression that clears the 2x RME band', () => {
    const result = compareBenchResults(withCompatBench('uniku', 1_000, 2), withCompatBench('uniku', 700, 2), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.hasRegression).toBe(true)
    expect(result.rows[0]).toMatchObject({ change: -0.3, status: 'regression', owned: true })
  })

  it('aggregates repeated benchmark runs by their median throughput and RME', () => {
    const result = aggregateBenchResults([withSingleBench(100, 1), withSingleBench(300, 3), withSingleBench(200, 2)])

    const benchmark = collectBenchmarks(result).get('__tests__/bench/id.bench.ts > ID Generation > uuidv4')
    expect(benchmark).toMatchObject({
      hz: 200,
      rme: 2,
    })
    expect(benchmark?.withinActionRme).toBeCloseTo(145.2948)
    expect(result.history).toHaveLength(3)
  })

  it('rejects repetitions with different benchmark matrices', () => {
    const changedMatrix = withSingleBench(300, 3)
    changedMatrix.files[0].groups[0].benchmarks.push(bench('uuidv7', 200, 2))

    expect(() => aggregateBenchResults([withSingleBench(100, 1), changedMatrix])).toThrow('Benchmark matrix mismatch')
  })

  it('keeps a bounded action-level history when adding an aggregate run', () => {
    const firstAction = aggregateBenchResults([withSingleBench(100, 1), withSingleBench(200, 2)])
    const current = aggregateBenchResults([withSingleBench(300, 3), withSingleBench(400, 4)])
    const baseline = mergeBenchmarkHistory(undefined, firstAction, 3)

    const result = mergeBenchmarkHistory(baseline, current, 3)

    expect(result.history).toHaveLength(2)
    expect(result.history?.map((snapshot) => snapshot.files[0].groups[0].benchmarks[0].hz)).toEqual([150, 350])
    const benchmark = collectBenchmarks(result).get('__tests__/bench/id.bench.ts > ID Generation > uuidv4')
    expect(benchmark).toMatchObject({
      hz: 250,
    })
    expect(benchmark?.crossActionRme).toBeCloseTo(116.23584)
  })

  it('uses cross-action dispersion when deciding whether a benchmark changed', () => {
    const baseline = withSingleBench(1_000, 1)
    baseline.files[0].groups[0].benchmarks[0].crossActionRme = 30

    const result = compareBenchResults(baseline, withSingleBench(800, 1), {
      regressionThreshold: 0.1,
      improvementThreshold: 0.1,
    })

    expect(result.rows[0]).toMatchObject({ combinedRme: 0.31, status: 'neutral' })
  })
})

function withSingleBench(hz: number, rme: number): BenchResults {
  return {
    files: [
      {
        filepath: '/repo/packages/uniku/__tests__/bench/id.bench.ts',
        groups: [
          {
            fullName: '__tests__/bench/id.bench.ts > ID Generation',
            benchmarks: [bench('uuidv4', hz, rme)],
          },
        ],
      },
    ],
  }
}

function withCompatBench(leaf: string, hz: number, rme: number): BenchResults {
  return {
    files: [
      {
        filepath: '/repo/packages/uniku/__tests__/bench/compat.bench.ts',
        groups: [
          {
            fullName: '__tests__/bench/compat.bench.ts > Generation > UUID v7',
            benchmarks: [bench(leaf, hz, rme)],
          },
        ],
      },
    ],
  }
}
