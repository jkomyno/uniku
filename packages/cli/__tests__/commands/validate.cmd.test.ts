import { describe, expect, layer } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import { objectid } from 'uniku/objectid'
import { tsid } from 'uniku/tsid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { CliError, ValidationFailedError } from '@/src/domain/errors'
import { cli, MockOutput, TestLive } from '../__utils__'

describe('CLI: uniku validate', () => {
  const dashLeadingNanoid = '-aaaaaaaaaaaaaaaaaaaa'
  // Fixed, deliberately constructed TSID-shaped string (not generated): leading
  // char is a lowercase hex letter ("a", within the valid 0-9A-F leading-char
  // range), remaining 12 chars are all in [0-9a-z]. This also satisfies CUID2's
  // default `/^[a-z][0-9a-z]+$/` regex at length 13 - a genuine collision that
  // validateAutoDetect's ordering fix (TSID before CUID2/Nanoid) must resolve.
  const collisionTsid = `a${'0'.repeat(11)}c`

  layer(TestLive())((it) => {
    it.effect('[Given] valid UUID v4 [Then] outputs valid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['validate', id])
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('valid')
      }),
    )

    it.effect('[Given] valid UUID v7 [Then] outputs valid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv7()
        yield* cli(['validate', id])
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('valid')
      }),
    )

    it.effect('[Given] invalid ID [Then] outputs invalid and writes error', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        // The ValidationFailedError propagates through the runner,
        // but output is written before the error is raised.
        yield* cli(['validate', '!!!bad!!!']).pipe(Effect.catch(() => Effect.void))
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('invalid')
      }),
    )

    it.effect('[Given] TypeID [Then] auto-detects and validates as TypeID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = typeid('user')
        yield* cli(['validate', id])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (typeid v7)'])
      }),
    )

    it.effect('[Given] --type typeid and valid TypeID [Then] validates as TypeID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = typeid('user')
        yield* cli(['validate', id, '--type', 'typeid'])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (typeid v7)'])
      }),
    )

    it.effect('[Given] --type uuid and valid UUID [Then] validates as UUID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['validate', id, '--type', 'uuid'])
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('valid')
        expect(output.join('')).toContain('uuid')
      }),
    )

    it.effect('[Given] --type uuid and valid ULID [Then] reports invalid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = ulid()
        const result = yield* cli(['validate', id, '--type', 'uuid']).pipe(Effect.flip)
        assertInstanceOf(result, ValidationFailedError)
      }),
    )

    it.effect('[Given] ObjectID [Then] auto-detects and validates as ObjectID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = objectid()
        yield* cli(['validate', id])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (objectid)'])
      }),
    )

    it.effect('[Given] --type objectid and valid ObjectID [Then] validates as ObjectID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = objectid()
        yield* cli(['validate', id, '--type', 'objectid'])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (objectid)'])
      }),
    )

    it.effect(
      '[Given] an ObjectID hex string starting with a-f [Then] auto-detects as objectid, not cuid (KTD6/R9)',
      () =>
        Effect.gen(function* () {
          // Fixed known value (not generated) to guarantee the first char is in a-f -
          // this is the exact collision CUID2's default regex would otherwise accept.
          const id = 'aabbccddeeff001122334455'
          yield* MockOutput.reset
          yield* cli(['validate', id])
          const output = yield* MockOutput.getStdout
          expect(output).toEqual(['valid (objectid)'])
        }),
    )

    it.effect(
      '[Given] --type objectid and --type cuid on the same collision ID [Then] both explicit paths validate correctly',
      () =>
        Effect.gen(function* () {
          const id = 'aabbccddeeff001122334455'

          yield* MockOutput.reset
          yield* cli(['validate', id, '--type', 'objectid'])
          const asObjectid = yield* MockOutput.getStdout
          expect(asObjectid).toEqual(['valid (objectid)'])

          yield* MockOutput.reset
          yield* cli(['validate', id, '--type', 'cuid'])
          const asCuid = yield* MockOutput.getStdout
          expect(asCuid).toEqual(['valid (cuid)'])
        }),
    )

    it.effect('[Given] TSID [Then] auto-detects and validates as TSID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = tsid.toString(tsid())
        yield* cli(['validate', id])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (tsid)'])
      }),
    )

    it.effect('[Given] --type tsid and valid TSID [Then] validates as TSID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = tsid.toString(tsid())
        yield* cli(['validate', id, '--type', 'tsid'])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (tsid)'])
      }),
    )

    it.effect(
      '[Given] a lowercase-leading-hex-letter TSID string [Then] auto-detects as tsid, not cuid/nanoid (ordering fix)',
      () =>
        Effect.gen(function* () {
          // Fixed known value (not generated) to guarantee the leading char is a
          // hex letter - see `collisionTsid`'s doc comment above.
          yield* MockOutput.reset
          yield* cli(['validate', collisionTsid])
          const output = yield* MockOutput.getStdout
          expect(output).toEqual(['valid (tsid)'])
        }),
    )

    it.effect(
      '[Given] --type tsid and --type nanoid on the same collision ID [Then] both explicit paths validate correctly',
      () =>
        Effect.gen(function* () {
          yield* MockOutput.reset
          yield* cli(['validate', collisionTsid, '--type', 'tsid'])
          const asTsid = yield* MockOutput.getStdout
          expect(asTsid).toEqual(['valid (tsid)'])

          yield* MockOutput.reset
          yield* cli(['validate', collisionTsid, '--type', 'nanoid'])
          const asNanoid = yield* MockOutput.getStdout
          expect(asNanoid).toEqual(['valid (nanoid)'])
        }),
    )

    it.effect('[Given] --json [Then] outputs JSON validation result', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['validate', id, '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(parsed.valid).toBe(true)
        expect(parsed.type).toBe('uuid')
      }),
    )

    it.effect('[Given] --quiet [Then] no output', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['validate', id, '--quiet'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(0)
      }),
    )

    it.effect('[Given] id after end-of-options marker [Then] validates it', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['validate', '--', id])
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('valid')
      }),
    )

    it.effect('[Given] dash-leading nanoid after end-of-options marker [Then] validates it as an ID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['validate', '--', dashLeadingNanoid])
        const output = yield* MockOutput.getStdout
        expect(output.join('')).toContain('valid (nanoid)')
      }),
    )

    it.effect('[Given] flag-shaped nanoid after end-of-options marker [Then] treats it as an ID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['validate', '--', '--json'])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual(['valid (nanoid)'])
      }),
    )
  })
})

describe('CLI: uniku validate --stdin', () => {
  const uuid1 = uuidv4()
  const uuid2 = uuidv7()

  layer(TestLive({ stdinLines: [uuid1, uuid2] }))((it) => {
    it.effect('[Given] --stdin with valid IDs [Then] validates all', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['validate', '--stdin'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(2)
        for (const line of output) {
          expect(line).toContain('valid')
        }
      }),
    )
  })

  layer(TestLive({ stdinLines: [uuid1, '!!!bad!!!'] }))((it) => {
    it.effect('[Given] --stdin with mixed valid/invalid [Then] outputs both results', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['validate', '--stdin']).pipe(Effect.catch(() => Effect.void))
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(2)
        expect(output[0]).toContain('valid')
        expect(output[1]).toContain('invalid')
      }),
    )
  })

  layer(TestLive({ stdinLines: [] }))((it) => {
    it.effect('[Given] --stdin with empty input [Then] returns NO_INPUT error', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const result = yield* cli(['validate', '--stdin']).pipe(Effect.flip)
        assertInstanceOf(result, CliError)
        expect(result.code).toBe('NO_INPUT')
      }),
    )
  })
})
