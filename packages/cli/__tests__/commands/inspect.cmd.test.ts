import { describe, expect, layer } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import { ksuid } from 'uniku/ksuid'
import { objectid } from 'uniku/objectid'
import { tsid } from 'uniku/tsid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { xid } from 'uniku/xid'
import { CliError } from '@/src/domain/errors'
import { cli, MockOutput, TestLive } from '../__utils__'

describe('CLI: uniku inspect', () => {
  const dashLeadingNanoid = '-aaaaaaaaaaaaaaaaaaaa'

  layer(TestLive())((it) => {
    it.effect('[Given] UUID v7 [Then] shows timestamp and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv7()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('Type:')
        expect(output[0]).toContain('uuid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.effect('[Given] UUID v4 [Then] shows no-metadata note', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('uuid')
        expect(output[0]).toContain('no decodable metadata')
      }),
    )

    it.effect('[Given] ULID [Then] shows timestamp', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = ulid()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('ulid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.effect('[Given] KSUID [Then] shows timestamp and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = ksuid()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('ksuid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.effect('[Given] ObjectID [Then] shows timestamp and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = objectid()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('objectid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.effect('[Given] --type objectid [Then] skips auto-detection and returns the same result', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = objectid()
        yield* cli(['inspect', id, '--type', 'objectid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(parsed.type).toBe('objectid')
        expect(parsed.timestamp).toBeDefined()
        expect(parsed.timestamp_ms).toBeTypeOf('number')
        expect(parsed.random).toHaveLength(16)
      }),
    )

    it.effect('[Given] XID [Then] auto-detects and inspects its timestamp and tail', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = xid({ secs: 1_720_000_000, machineId: new Uint8Array(3), processId: 0, counter: 0 })
        yield* cli(['inspect', id, '--json'])
        expect(JSON.parse((yield* MockOutput.getStdout)[0])).toMatchObject({
          type: 'xid',
          timestamp_ms: 1_720_000_000_000,
          random: '0000000000000000',
        })
      }),
    )

    it.effect('[Given] TSID [Then] shows timestamp and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = tsid.toString(tsid())
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('tsid')
        expect(output[0]).toContain('Timestamp:')
        expect(output[0]).toContain('Random:')
      }),
    )

    it.effect('[Given] --type tsid [Then] skips auto-detection and returns the same result', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = tsid.toString(tsid())
        yield* cli(['inspect', id, '--type', 'tsid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(parsed.type).toBe('tsid')
        expect(parsed.timestamp).toBeDefined()
        expect(parsed.timestamp_ms).toBeTypeOf('number')
        // Combined node+counter tail: 22 bits, up to 6 hex chars.
        expect(parsed.random).toMatch(/^[0-9a-f]{1,6}$/)

        // Auto-detection should produce the exact same result.
        yield* MockOutput.reset
        yield* cli(['inspect', id, '--json'])
        const autoOutput = yield* MockOutput.getStdout
        expect(JSON.parse(autoOutput[0])).toEqual(parsed)
      }),
    )

    it.effect('[Given] TypeID [Then] shows prefix, suffix, timestamp, and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = typeid('user')
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('typeid')
        expect(output[0]).toContain('Prefix:')
        expect(output[0]).toContain('user')
        expect(output[0]).toContain('Suffix:')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.effect('[Given] --json [Then] outputs JSON result', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv7()
        yield* cli(['inspect', id, '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(parsed.type).toBe('uuid')
        expect(parsed.version).toBe(7)
        expect(parsed.timestamp).toBeDefined()
        expect(parsed.timestamp_ms).toBeTypeOf('number')
      }),
    )

    it.effect('[Given] --type uuid [Then] forces UUID inspection', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['inspect', id, '--type', 'uuid'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('uuid')
      }),
    )

    it.effect('[Given] dash-leading nanoid after end-of-options marker [Then] inspects it as an ID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['inspect', '--', dashLeadingNanoid])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('nanoid')
        expect(output[0]).toContain('no decodable metadata')
      }),
    )

    it.effect('[Given] flag-shaped nanoid after end-of-options marker [Then] treats it as an ID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['inspect', '--', '--json'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('nanoid')
        expect(output[0]).toContain('no decodable metadata')
      }),
    )

    it.effect('[Given] unrecognizable ID [Then] returns UNKNOWN_ID_TYPE error', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const result = yield* cli(['inspect', '!!!not-an-id!!!']).pipe(Effect.flip)
        assertInstanceOf(result, CliError)
        expect(result.code).toBe('UNKNOWN_ID_TYPE')
      }),
    )
  })
})
