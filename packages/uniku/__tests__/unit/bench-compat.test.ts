import { implementationsForOrder, mergeImplementationResults } from '../../scripts/bench-compat'
import type { BenchResults } from '../../scripts/bench-results'

describe('isolated compatibility benchmark', () => {
  it('uses the requested implementation launch order', () => {
    expect(implementationsForOrder('uniku-first')).toEqual(['uniku', 'reference'])
    expect(implementationsForOrder('reference-first')).toEqual(['reference', 'uniku'])
  })

  it('merges complementary process results and recomputes ranks', () => {
    const result = mergeImplementationResults([benchmarkResult('uniku', 200), benchmarkResult('npm', 100)])

    expect(result.files[0].groups[0].benchmarks).toEqual([
      { name: 'uniku', hz: 200, rme: 1, rank: 1 },
      { name: 'npm', hz: 100, rme: 1, rank: 2 },
    ])
  })

  it('rejects mismatched isolated result matrices', () => {
    const reference = benchmarkResult('npm', 100)
    reference.files[0].groups[0].fullName = 'different group'

    expect(() => mergeImplementationResults([benchmarkResult('uniku', 200), reference])).toThrow(
      'Isolated benchmark groups do not match',
    )
  })
})

function benchmarkResult(name: string, hz: number): BenchResults {
  return {
    files: [
      {
        filepath: '/repo/packages/uniku/__tests__/bench/compat.bench.ts',
        groups: [
          {
            fullName: '__tests__/bench/compat.bench.ts > Generation > NanoID',
            benchmarks: [{ name, hz, rme: 1, rank: 1 }],
          },
        ],
      },
    ],
  }
}
