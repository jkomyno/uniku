import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { ksuid } from 'uniku/ksuid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { CliError } from '@/src/domain/errors'
import { cli, MockOutput, TestLive } from '../__utils__'

describe('CLI: uniku inspect', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] UUID v7 [Then] shows timestamp and random', () =>
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

    it.scoped('[Given] UUID v4 [Then] shows no-metadata note', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('uuid')
        expect(output[0]).toContain('no decodable metadata')
      }),
    )

    it.scoped('[Given] ULID [Then] shows timestamp', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = ulid()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('ulid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.scoped('[Given] KSUID [Then] shows timestamp and random', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = ksuid()
        yield* cli(['inspect', id])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('ksuid')
        expect(output[0]).toContain('Timestamp:')
      }),
    )

    it.scoped('[Given] --json [Then] outputs JSON result', () =>
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

    it.scoped('[Given] --type uuid [Then] forces UUID inspection', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const id = uuidv4()
        yield* cli(['inspect', id, '--type', 'uuid'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toContain('uuid')
      }),
    )

    it.scoped('[Given] unrecognizable ID [Then] returns UNKNOWN_ID_TYPE error', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const result = yield* cli(['inspect', '!!!not-an-id!!!']).pipe(Effect.flip)
        expect(result).toBeInstanceOf(CliError)
        expect((result as CliError).code).toBe('UNKNOWN_ID_TYPE')
      }),
    )
  })
})
