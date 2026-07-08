import {
  type BenchResults,
  collectBenchGroups,
  collectBenchmarks,
  compareBenchResults,
  isOwnedBenchmark,
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
