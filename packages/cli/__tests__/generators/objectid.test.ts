import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { generateObjectid } from '@/src/generators/objectid'

describe('generateObjectid', () => {
  it.effect('generates a single ObjectID', () =>
    Effect.gen(function* () {
      const ids = yield* generateObjectid({ count: 1 })
      expect(ids).toHaveLength(1)
      // ObjectID is 24 chars, lowercase hex
      expect(ids[0].length).toBe(24)
      expect(ids[0]).toMatch(/^[0-9a-f]+$/)
    }),
  )

  it.effect('generates multiple ObjectIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateObjectid({ count: 3 })
      expect(ids).toHaveLength(3)
    }),
  )

  it.effect('generates ObjectID with explicit timestamp', () =>
    Effect.gen(function* () {
      const msecs = Date.now()
      const ids = yield* generateObjectid({ count: 1, timestamp: msecs })
      expect(ids).toHaveLength(1)
      expect(ids[0].length).toBe(24)
    }),
  )
})
