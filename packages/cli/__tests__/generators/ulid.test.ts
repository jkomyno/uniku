import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { CliError } from '@/src/domain/errors'
import { generateUlid } from '@/src/generators/ulid'

describe('generateUlid', () => {
  it.effect('generates a single ULID', () =>
    Effect.gen(function* () {
      const ids = yield* generateUlid({ count: 1, monotonic: false, lowercase: false })
      expect(ids).toHaveLength(1)
      expect(ids[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
    }),
  )

  it.effect('generates multiple ULIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateUlid({ count: 3, monotonic: false, lowercase: false })
      expect(ids).toHaveLength(3)
    }),
  )

  it.effect('generates ULID with explicit timestamp', () =>
    Effect.gen(function* () {
      const ts = 1700000000000
      const ids = yield* generateUlid({ count: 1, monotonic: false, timestamp: ts, lowercase: false })
      expect(ids).toHaveLength(1)
      expect(ids[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
    }),
  )

  it.effect('applies lowercase transform', () =>
    Effect.gen(function* () {
      const ids = yield* generateUlid({ count: 1, monotonic: false, lowercase: true })
      expect(ids[0]).toBe(ids[0].toLowerCase())
    }),
  )

  it.effect('rejects --monotonic combined with --timestamp', () =>
    Effect.gen(function* () {
      const result = yield* generateUlid({
        count: 1,
        monotonic: true,
        timestamp: 1700000000000,
        lowercase: false,
      }).pipe(Effect.flip)
      expect(result).toBeInstanceOf(CliError)
      expect(result.code).toBe('INVALID_OPTIONS')
    }),
  )

  it.effect('accepts --monotonic without --timestamp', () =>
    Effect.gen(function* () {
      const ids = yield* generateUlid({ count: 1, monotonic: true, lowercase: false })
      expect(ids).toHaveLength(1)
    }),
  )
})
