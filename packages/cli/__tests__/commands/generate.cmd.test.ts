import { describe, expect, layer } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import { tsid } from 'uniku/tsid'
import { CliError } from '@/src/domain/errors'
import { cli, MockOutput, TestConsole, TestLive } from '../__utils__'

const expectCliRejects = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    yield* MockOutput.reset
    const didSucceed = yield* cli(args).pipe(
      Effect.as(true),
      Effect.catch(() => Effect.succeed(false)),
    )
    expect(didSucceed).toBe(false)
  })

describe('CLI: uniku generate uuid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate uuid [Then] generates 1 UUID v4', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.effect('[Given] generate uuid -n 3 [Then] generates 3 UUIDs', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '-n', '3'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(3)
      }),
    )

    it.effect('[Given] generate uuid -v 7 [Then] generates UUID v7', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '-v', '7'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.effect('[Given] generate uuid --json [Then] outputs JSON string', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '--json'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.effect('[Given] generate uuid --json -n 2 [Then] outputs JSON array', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '--json', '-n', '2'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        const parsed = JSON.parse(output[0])
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed).toHaveLength(2)
      }),
    )

    it.effect('[Given] generate uuid --lowercase [Then] output is lowercase', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '--lowercase'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toBe(output[0].toLowerCase())
      }),
    )

    it.effect('[Given] generate uuid -l [Then] rejects the removed lowercase alias', () =>
      expectCliRejects(['generate', 'uuid', '-l']),
    )
  })
})

describe('CLI: uniku generate ulid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate ulid [Then] generates 1 ULID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ulid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
      }),
    )

    it.effect('[Given] generate ulid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ulid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.effect('[Given] generate ulid -l [Then] rejects the removed lowercase alias', () =>
      expectCliRejects(['generate', 'ulid', '-l']),
    )

    it.effect('[Given] generate ulid --timestamp abc [Then] fails with a CliError', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'ulid', '--timestamp', 'abc']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
        expect(error.message).toBe('Invalid timestamp: "abc"')
        expect(error.hint).toBe('Provide a Unix timestamp in milliseconds or "now"')
      }),
    )
  })
})

describe('CLI: uniku generate typeid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate typeid [Then] generates 1 prefixless TypeID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'typeid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
      }),
    )

    it.effect('[Given] generate typeid --prefix user [Then] generates a user TypeID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'typeid', '--prefix', 'user'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
      }),
    )

    it.effect('[Given] generate typeid -p api_key --json -n 2 [Then] outputs JSON array', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'typeid', '-p', 'api_key', '--json', '-n', '2'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed).toHaveLength(2)
        expect(parsed[0]).toMatch(/^api_key_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
      }),
    )
  })
})

describe('CLI: uniku generate nanoid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate nanoid [Then] generates 1 nanoid (size=21)', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(21)
      }),
    )

    it.effect('[Given] generate nanoid --size 10 [Then] generates nanoid of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid', '--size', '10'])
        const output = yield* MockOutput.getStdout
        expect(output[0].length).toBe(10)
      }),
    )

    it.effect('[Given] generate nanoid --alphabet hex [Then] output is hex chars only', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid', '--alphabet', 'hex'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toMatch(/^[0-9a-f]+$/)
      }),
    )
  })
})

describe('CLI: uniku generate cuid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate cuid [Then] generates 1 CUID (length=24)', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'cuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
      }),
    )

    it.effect('[Given] generate cuid --length 10 [Then] generates CUID of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'cuid', '--length', '10'])
        const output = yield* MockOutput.getStdout
        expect(output[0].length).toBe(10)
      }),
    )

    it.effect('[Given] generate cuid -l 10 [Then] generates CUID of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'cuid', '-l', '10'])
        const output = yield* MockOutput.getStdout
        expect(output[0].length).toBe(10)
      }),
    )
  })
})

describe('CLI: uniku generate ksuid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate ksuid [Then] generates 1 KSUID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ksuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(27)
        expect(output[0]).toMatch(/^[0-9A-Za-z]+$/)
      }),
    )

    it.effect('[Given] generate ksuid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ksuid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.effect('[Given] generate ksuid --timestamp abc [Then] fails with a CliError', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'ksuid', '--timestamp', 'abc']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
        expect(error.message).toBe('Invalid timestamp: "abc"')
        expect(error.hint).toBe('Provide a Unix timestamp in seconds or "now"')
      }),
    )
  })
})

describe('CLI: uniku generate objectid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate objectid [Then] generates 1 ObjectID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'objectid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
        expect(output[0]).toMatch(/^[0-9a-f]+$/)
      }),
    )

    it.effect('[Given] generate objectid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'objectid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.effect('[Given] generate objectid --timestamp <secs> [Then] embeds the given timestamp', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const secs = 1_720_000_000
        yield* cli(['generate', 'objectid', '--timestamp', String(secs)])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        // Timestamp is the first 8 hex chars, big-endian seconds.
        const expectedPrefix = secs.toString(16).padStart(8, '0')
        expect(output[0].slice(0, 8)).toBe(expectedPrefix)
      }),
    )

    it.effect('[Given] generate objectid --timestamp abc [Then] fails with a CliError', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'objectid', '--timestamp', 'abc']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
        expect(error.message).toBe('Invalid timestamp: "abc"')
        expect(error.hint).toBe('Provide a Unix timestamp in seconds or "now"')
      }),
    )
  })
})

describe('CLI: uniku generate tsid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] generate tsid [Then] generates 1 TSID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'tsid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(13)
        expect(output[0]).toMatch(/^[0-9A-Fa-f][0-9A-HJKMNP-TV-Z]{12}$/i)
      }),
    )

    it.effect('[Given] generate tsid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'tsid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.effect('[Given] generate tsid --timestamp <ms> [Then] embeds the given timestamp', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const msecs = 1_720_000_000_000
        yield* cli(['generate', 'tsid', '--timestamp', String(msecs)])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        const value = tsid.fromString(output[0])
        expect(tsid.timestamp(value)).toBe(msecs)
      }),
    )

    it.effect('[Given] generate tsid --timestamp abc [Then] fails with a CliError', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'tsid', '--timestamp', 'abc']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
        expect(error.message).toBe('Invalid timestamp: "abc"')
        expect(error.hint).toBe('Provide a Unix timestamp in milliseconds or "now"')
      }),
    )

    it.effect('[Given] generate tsid --node 42 --node-bits 10 [Then] embeds the given node', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'tsid', '--node', '42', '--node-bits', '10'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        const value = tsid.fromString(output[0])
        const counterBits = 22 - 10
        const nodeMask = (1 << 10) - 1
        const decodedNode = Number((value >> BigInt(counterBits)) & BigInt(nodeMask))
        expect(decodedNode).toBe(42)
      }),
    )

    it.effect('[Given] generate tsid --node-bits 25 [Then] fails with a CliError (out of [0, 20] range)', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'tsid', '--node-bits', '25']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('TSID_NODE_BITS_OUT_OF_RANGE')
      }),
    )
  })
})

describe('CLI: shorthand commands', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] uniku uuid [Then] same as generate uuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.effect('[Given] uniku uuid --uuid-version 7 [Then] generates UUID v7', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid', '--uuid-version', '7'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.effect('[Given] uniku uuid --version [Then] prints CLI version', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid', '--version'])
        const output = yield* MockOutput.getStdout
        const lines = yield* TestConsole.getLines({ stripAnsi: true })
        expect(output).toHaveLength(0)
        expect(lines.join('\n')).toContain('0.0.0-test')
      }),
    )

    it.effect('[Given] uniku ulid [Then] same as generate ulid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['ulid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
      }),
    )

    it.effect('[Given] uniku typeid --prefix user [Then] same as generate typeid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['typeid', '--prefix', 'user'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
      }),
    )

    it.effect('[Given] uniku nanoid [Then] same as generate nanoid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['nanoid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(21)
      }),
    )

    it.effect('[Given] uniku cuid [Then] same as generate cuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['cuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
      }),
    )

    it.effect('[Given] uniku ksuid [Then] same as generate ksuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['ksuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(27)
      }),
    )

    it.effect('[Given] uniku objectid [Then] same as generate objectid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['objectid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
      }),
    )

    it.effect('[Given] uniku tsid [Then] same as generate tsid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['tsid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(13)
        expect(output[0]).toMatch(/^[0-9A-Fa-f][0-9A-HJKMNP-TV-Z]{12}$/i)
      }),
    )
  })
})
