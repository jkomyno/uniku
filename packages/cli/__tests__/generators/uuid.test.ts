import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { generateUuid } from '@/src/generators/uuid'

const _run = <A, E>(self: Effect.Effect<A, E>) => Effect.runPromise(self)

describe('generateUuid', () => {
  it.effect('generates a single UUID v4 by default', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({ count: 1, version: 4, lowercase: false })
      expect(ids).toHaveLength(1)
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    }),
  )

  it.effect('generates multiple unique UUIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({ count: 5, version: 4, lowercase: false })
      expect(ids).toHaveLength(5)
      expect(new Set(ids).size).toBe(5)
    }),
  )

  it.effect('generates UUID v7 with version nibble 7', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({ count: 1, version: 7, lowercase: false })
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    }),
  )

  it.effect('applies lowercase transform', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({ count: 1, version: 4, lowercase: true })
      expect(ids[0]).toBe(ids[0].toLowerCase())
    }),
  )

  it.effect('generates 0 IDs when count is 0', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({ count: 0, version: 4, lowercase: false })
      expect(ids).toHaveLength(0)
    }),
  )
})
