import { readFileSync } from 'node:fs'

export type BundleSize = {
  name: string
  minifiedBytes: number
  gzipBytes: number
  hasExternal: boolean
}

/** Minified and gzipped size of one entry point in the base and head checkouts. */
export type BundleSizeDiff = {
  name: string
  /** `undefined` when the entry point does not exist in the base checkout. */
  baseBytes: number | undefined
  /** `undefined` when the entry point does not exist in the head checkout. */
  headBytes: number | undefined
  hasExternal: boolean
}

export function loadBundleSizes(path: string): BundleSize[] {
  // SAFETY: the file is written by bundle-summary.ts --json, in the BundleSize[] format.
  return JSON.parse(readFileSync(path, 'utf-8')) as BundleSize[]
}

/** Pair entry points by import name, in head order, then the ones head removed. */
export function diffBundleSizes(base: readonly BundleSize[], head: readonly BundleSize[]): BundleSizeDiff[] {
  const baseByName = new Map(base.map((size) => [size.name, size]))
  const headNames = new Set(head.map(({ name }) => name))

  return [
    ...head.map((size) => ({
      name: size.name,
      baseBytes: baseByName.get(size.name)?.gzipBytes,
      headBytes: size.gzipBytes,
      hasExternal: size.hasExternal,
    })),
    ...base
      .filter(({ name }) => !headNames.has(name))
      .map((size) => ({
        name: size.name,
        baseBytes: size.gzipBytes,
        headBytes: undefined,
        hasExternal: size.hasExternal,
      })),
  ]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `~${bytes} B`
  }
  return `~${(bytes / 1024).toFixed(1)} KB`
}

/**
 * The exact gzipped byte change. Bundle sizes are deterministic, so any
 * nonzero delta comes from the change under review.
 */
export function formatBundleDelta({ baseBytes, headBytes }: BundleSizeDiff): string {
  if (baseBytes === undefined) return 'new'
  if (headBytes === undefined) return 'removed'

  const delta = headBytes - baseBytes
  if (delta === 0) return '0 B'
  const sign = delta > 0 ? '+' : '-'
  const percent = ((Math.abs(delta) / baseBytes) * 100).toFixed(1)
  return `${sign}${Math.abs(delta)} B (${sign}${percent}%)`
}

export function hasBundleSizeChange({ baseBytes, headBytes }: BundleSizeDiff): boolean {
  return baseBytes !== headBytes
}
