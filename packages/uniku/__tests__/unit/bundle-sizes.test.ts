import { type BundleSize, diffBundleSizes, formatBundleDelta } from '../../scripts/bundle-sizes'

function size(name: string, gzipBytes: number): BundleSize {
  return { name, minifiedBytes: gzipBytes * 2, gzipBytes, hasExternal: false }
}

describe('bundle size diff', () => {
  it('pairs entry points by name and keeps entries present on one side', () => {
    const diff = diffBundleSizes(
      [size('uniku/ulid', 1_000), size('uniku/legacy', 300)],
      [size('uniku/ulid', 1_010), size('uniku/xid', 500)],
    )

    expect(diff.map(({ name, baseBytes, headBytes }) => ({ name, baseBytes, headBytes }))).toEqual([
      { name: 'uniku/ulid', baseBytes: 1_000, headBytes: 1_010 },
      { name: 'uniku/xid', baseBytes: undefined, headBytes: 500 },
      { name: 'uniku/legacy', baseBytes: 300, headBytes: undefined },
    ])
    expect(diff.map(formatBundleDelta)).toEqual(['+10 B (+1.0%)', 'new', 'removed'])
  })

  it('reports exact byte deltas in both directions', () => {
    const [unchanged, smaller] = diffBundleSizes(
      [size('uniku/ulid', 1_000), size('uniku/xid', 400)],
      [size('uniku/ulid', 1_000), size('uniku/xid', 398)],
    )

    expect(formatBundleDelta(unchanged)).toBe('0 B')
    expect(formatBundleDelta(smaller)).toBe('-2 B (-0.5%)')
  })
})
