import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { tsid } from 'uniku/tsid'
import { generateTsid } from '@/src/generators/tsid'

describe('generateTsid', () => {
  it.effect('generates a single TSID', () =>
    Effect.gen(function* () {
      const ids = yield* generateTsid({ count: 1 })
      expect(ids).toHaveLength(1)
      // TSID is 13 chars, Crockford Base32, leading char restricted to 0-9A-F.
      expect(typeof ids[0]).toBe('string')
      expect(ids[0].length).toBe(13)
      expect(ids[0]).toMatch(/^[0-9A-Fa-f][0-9A-HJKMNP-TV-Z]{12}$/i)
    }),
  )

  it.effect('generates multiple TSIDs, never leaking raw bigints', () =>
    Effect.gen(function* () {
      const ids = yield* generateTsid({ count: 3 })
      expect(ids).toHaveLength(3)
      for (const id of ids) {
        expect(typeof id).toBe('string')
      }
    }),
  )

  it.effect('generates TSID with explicit timestamp', () =>
    Effect.gen(function* () {
      const msecs = 1_720_000_000_000
      const ids = yield* generateTsid({ count: 1, timestamp: msecs })
      expect(ids).toHaveLength(1)
      const value = tsid.fromString(ids[0])
      expect(tsid.timestamp(value)).toBe(msecs)
    }),
  )

  it.effect('generates TSID with explicit node and node-bits', () =>
    Effect.gen(function* () {
      const node = 5
      const nodeBits = 4
      const ids = yield* generateTsid({ count: 1, node, nodeBits })
      expect(ids).toHaveLength(1)
      const value = tsid.fromString(ids[0])
      const counterBits = 22 - nodeBits
      const nodeMask = (1 << nodeBits) - 1
      const decodedNode = Number((value >> BigInt(counterBits)) & BigInt(nodeMask))
      expect(decodedNode).toBe(node)
    }),
  )

  it.effect('generates TSID with explicit node using the default node-bits', () =>
    Effect.gen(function* () {
      const node = 42
      const ids = yield* generateTsid({ count: 1, node })
      expect(ids).toHaveLength(1)
      const value = tsid.fromString(ids[0])
      const counterBits = 22 - 10 // default nodeBits is 10
      const nodeMask = (1 << 10) - 1
      const decodedNode = Number((value >> BigInt(counterBits)) & BigInt(nodeMask))
      expect(decodedNode).toBe(node)
    }),
  )

  it.effect('batch generation with a tiny counter range (--node-bits 20) never produces duplicates', () =>
    Effect.gen(function* () {
      // counterBits = 22 - 20 = 2, only 4 possible counter values - a naive
      // independent-random-draw-per-id implementation would collide almost
      // certainly across 10 ids; the fix must step the counter deterministically.
      const ids = yield* generateTsid({ count: 10, node: 5, nodeBits: 20 })
      expect(ids).toHaveLength(10)
      expect(new Set(ids).size).toBe(10)
      const sorted = [...ids].sort()
      expect(ids).toEqual(sorted)
    }),
  )
})
