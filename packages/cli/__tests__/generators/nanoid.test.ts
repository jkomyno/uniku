import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { generateNanoid } from '@/src/generators/nanoid'

describe('generateNanoid', () => {
  it.effect('generates a single nanoid with default size (21)', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 21 })
      expect(ids).toHaveLength(1)
      expect(ids[0].length).toBe(21)
    }),
  )

  it.effect('generates nanoid with custom size', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 10 })
      expect(ids[0].length).toBe(10)
    }),
  )

  it.effect('generates multiple nanoids', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 5, size: 21 })
      expect(ids).toHaveLength(5)
    }),
  )

  it.effect('uses hex alphabet preset', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 21, alphabet: 'hex' })
      expect(ids[0]).toMatch(/^[0-9a-f]+$/)
    }),
  )

  it.effect('uses numeric alphabet preset', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 21, alphabet: 'numeric' })
      expect(ids[0]).toMatch(/^[0-9]+$/)
    }),
  )

  it.effect('uses alpha alphabet preset', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 21, alphabet: 'alpha' })
      expect(ids[0]).toMatch(/^[a-zA-Z]+$/)
    }),
  )

  it.effect('uses custom alphabet string', () =>
    Effect.gen(function* () {
      const ids = yield* generateNanoid({ count: 1, size: 10, alphabet: 'AB' })
      expect(ids[0]).toMatch(/^[AB]+$/)
      expect(ids[0].length).toBe(10)
    }),
  )
})
