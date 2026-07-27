import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { ksuid } from 'uniku/ksuid'
import { generateKsuid } from '@/src/generators/ksuid'

describe('generateKsuid', () => {
  it.effect('generates a single KSUID', () =>
    Effect.gen(function* () {
      const ids = yield* generateKsuid({ count: 1 })
      expect(ids).toHaveLength(1)
      // KSUID is 27 chars, Base62
      expect(ids[0].length).toBe(27)
      expect(ids[0]).toMatch(/^[0-9A-Za-z]+$/)
    }),
  )

  it.effect('generates multiple KSUIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateKsuid({ count: 3 })
      expect(ids).toHaveLength(3)
    }),
  )

  it.effect('generates KSUID with explicit timestamp', () =>
    Effect.gen(function* () {
      const msecs = 1_720_000_000_123
      const ids = yield* generateKsuid({ count: 1, timestamp: msecs })
      expect(ids).toHaveLength(1)
      expect(ksuid.timestamp(ids[0])).toBe(1_720_000_000_000)
    }),
  )
})
