import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { generateCuid } from '@/src/generators/cuid'

describe('generateCuid', () => {
  it.effect('generates a single CUID with default length (24)', () =>
    Effect.gen(function* () {
      const ids = yield* generateCuid({ count: 1, length: 24 })
      expect(ids).toHaveLength(1)
      expect(ids[0].length).toBe(24)
      // CUID v2 starts with a letter
      expect(ids[0]).toMatch(/^[a-z]/)
    }),
  )

  it.effect('generates CUID with custom length', () =>
    Effect.gen(function* () {
      const ids = yield* generateCuid({ count: 1, length: 10 })
      expect(ids[0].length).toBe(10)
    }),
  )

  it.effect('generates multiple CUIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateCuid({ count: 3, length: 24 })
      expect(ids).toHaveLength(3)
      expect(new Set(ids).size).toBe(3)
    }),
  )

  it.effect('generates CUID at min boundary (length=2)', () =>
    Effect.gen(function* () {
      const ids = yield* generateCuid({ count: 1, length: 2 })
      expect(ids[0].length).toBe(2)
    }),
  )

  it.effect('generates CUID at max boundary (length=32)', () =>
    Effect.gen(function* () {
      const ids = yield* generateCuid({ count: 1, length: 32 })
      expect(ids[0].length).toBe(32)
    }),
  )
})
