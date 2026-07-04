import {
  type BenchResults,
  collectBenchGroups,
  collectBenchmarks,
  compareBenchResults,
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
    })
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
