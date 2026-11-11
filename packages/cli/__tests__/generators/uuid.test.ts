import { describe, expect, it } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import { uuidv5 } from 'uniku/uuid/v5'
import { CliError } from '@/src/domain/errors'
import { generateUuid } from '@/src/generators/uuid'

// RFC 9562 Appendix A.4 test vector.
const RFC_V5_NAME = 'www.example.com'
const RFC_V5_DNS_ID = '2ed6657d-e927-568b-95e1-2665a8aea6a2'

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

  it.effect('derives the RFC 9562 UUID v5 vector from the dns alias', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({
        count: 1,
        version: 5,
        lowercase: false,
        name: RFC_V5_NAME,
        namespace: 'dns',
      })
      expect(ids).toEqual([RFC_V5_DNS_ID])
    }),
  )

  it.effect('resolves namespace aliases case-insensitively', () =>
    Effect.gen(function* () {
      for (const [alias, namespace] of [
        ['DNS', uuidv5.DNS],
        ['Url', uuidv5.URL],
        ['oid', uuidv5.OID],
        ['X500', uuidv5.X500],
      ] as const) {
        const ids = yield* generateUuid({ count: 1, version: 5, lowercase: false, name: 'n', namespace: alias })
        expect(ids).toEqual([uuidv5('n', namespace)])
      }
    }),
  )

  it.effect('accepts an explicit namespace UUID string', () =>
    Effect.gen(function* () {
      const ids = yield* generateUuid({
        count: 1,
        version: 5,
        lowercase: false,
        name: RFC_V5_NAME,
        namespace: '6BA7B810-9DAD-11D1-80B4-00C04FD430C8',
      })
      expect(ids).toEqual([RFC_V5_DNS_ID])
    }),
  )

  it.effect('maps a malformed namespace UUID to a CliError carrying the library code', () =>
    Effect.gen(function* () {
      const error = yield* generateUuid({
        count: 1,
        version: 5,
        lowercase: false,
        name: RFC_V5_NAME,
        namespace: 'not-a-uuid',
      }).pipe(Effect.flip)
      assertInstanceOf(error, CliError)
      expect(error.code).toBe('INVALID_LENGTH')
      expect(error.message).toContain('not-a-uuid')
    }),
  )

  const invalidOptionCases: ReadonlyArray<{
    readonly title: string
    readonly options: Parameters<typeof generateUuid>[0]
  }> = [
    { title: 'v5 without a name', options: { count: 1, version: 5, lowercase: false, namespace: 'dns' } },
    { title: 'v5 without a namespace', options: { count: 1, version: 5, lowercase: false, name: RFC_V5_NAME } },
    {
      title: 'v5 with count > 1',
      options: { count: 2, version: 5, lowercase: false, name: RFC_V5_NAME, namespace: 'dns' },
    },
    { title: 'a name with v4', options: { count: 1, version: 4, lowercase: false, name: RFC_V5_NAME } },
    { title: 'a namespace with v7', options: { count: 1, version: 7, lowercase: false, namespace: 'dns' } },
  ]

  for (const { title, options } of invalidOptionCases) {
    it.effect(`rejects ${title}`, () =>
      Effect.gen(function* () {
        const error = yield* generateUuid(options).pipe(Effect.flip)
        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_OPTIONS')
      }),
    )
  }
})
