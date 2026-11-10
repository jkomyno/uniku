import { describe, expect, layer } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import * as TestClock from 'effect/testing/TestClock'
import { ksuid } from 'uniku/ksuid'
import { objectid } from 'uniku/objectid'
import { tsid } from 'uniku/tsid'
import { ulid } from 'uniku/ulid'
import { xid } from 'uniku/xid'
import { CliError } from '@/src/domain/errors'
import { cli, MockOutput, TestConsole, TestLive } from '../__utils__'

const TIMESTAMP_MSECS = 1_720_000_000_123
// RFC 9562 Appendix A.4: UUID v5 of "www.example.com" in the DNS namespace.
const RFC_V5_DNS_ID = '2ed6657d-e927-568b-95e1-2665a8aea6a2'
const SECOND_PRECISION_TIMESTAMP_MSECS = 1_720_000_000_000

const timestampCases: ReadonlyArray<{
  readonly command: 'ulid' | 'ksuid' | 'objectid' | 'xid' | 'tsid'
  readonly decodeTimestamp: (id: string) => number
  readonly expectedTimestamp: number
}> = [
  { command: 'ulid', decodeTimestamp: ulid.timestamp, expectedTimestamp: TIMESTAMP_MSECS },
  { command: 'ksuid', decodeTimestamp: ksuid.timestamp, expectedTimestamp: SECOND_PRECISION_TIMESTAMP_MSECS },
  { command: 'objectid', decodeTimestamp: objectid.timestamp, expectedTimestamp: SECOND_PRECISION_TIMESTAMP_MSECS },
  { command: 'xid', decodeTimestamp: xid.timestamp, expectedTimestamp: SECOND_PRECISION_TIMESTAMP_MSECS },
  {
    command: 'tsid',
    decodeTimestamp: (id) => tsid.timestamp(tsid.fromString(id)),
    expectedTimestamp: TIMESTAMP_MSECS,
  },
]

const expectCliRejects = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    yield* MockOutput.reset
    const didSucceed = yield* cli(args).pipe(
      Effect.as(true),
      Effect.catch(() => Effect.succeed(false)),
    )
    expect(didSucceed).toBe(false)
  })

describe('CLI: timestamp semantics', () => {
  layer(TestLive())((it) => {
    for (const { command, decodeTimestamp, expectedTimestamp } of timestampCases) {
      it.effect(`[Given] ${command} --timestamp <ms> [Then] embeds the documented instant`, () =>
        Effect.gen(function* () {
          yield* MockOutput.reset
          yield* cli(['generate', command, '--timestamp', String(TIMESTAMP_MSECS)])
          const output = yield* MockOutput.getStdout
          expect(output).toHaveLength(1)
          expect(decodeTimestamp(output[0])).toBe(expectedTimestamp)
        }),
      )
    }

    it.effect('[Given] --timestamp now [Then] uses the Effect clock in milliseconds', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* TestClock.setTime(TIMESTAMP_MSECS)
        yield* cli(['generate', 'ulid', '--timestamp', 'now'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(ulid.timestamp(output[0])).toBe(TIMESTAMP_MSECS)
      }),
    )
  })
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

    it.effect('[Given] generate uuid -v 5 --name --namespace dns [Then] derives the RFC 9562 vector', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '-v', '5', '--name', 'www.example.com', '--namespace', 'dns'])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual([RFC_V5_DNS_ID])
      }),
    )

    it.effect('[Given] uuid -v 5 with an explicit namespace UUID [Then] derives the same ID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli([
          'uuid',
          '-v',
          '5',
          '--name',
          'www.example.com',
          '--namespace',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ])
        const output = yield* MockOutput.getStdout
        expect(output).toEqual([RFC_V5_DNS_ID])
      }),
    )

    it.effect('[Given] uuid -v 5 --json [Then] outputs the ID as a JSON string', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid', '--uuid-version', '5', '--name', 'www.example.com', '--namespace', 'DNS', '--json'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(JSON.parse(output[0])).toBe(RFC_V5_DNS_ID)
      }),
    )

    const v5UsageErrorCases: ReadonlyArray<{ readonly title: string; readonly args: ReadonlyArray<string> }> = [
      { title: '-v 5 without --name', args: ['uuid', '-v', '5', '--namespace', 'dns'] },
      { title: '-v 5 without --namespace', args: ['uuid', '-v', '5', '--name', 'www.example.com'] },
      {
        title: '-v 5 with -n 2',
        args: ['uuid', '-v', '5', '--name', 'www.example.com', '--namespace', 'dns', '-n', '2'],
      },
      { title: '--name with the default v4', args: ['uuid', '--name', 'www.example.com'] },
      { title: '--namespace with -v 7', args: ['generate', 'uuid', '-v', '7', '--namespace', 'dns'] },
    ]

    for (const { title, args } of v5UsageErrorCases) {
      it.effect(`[Given] ${title} [Then] fails with an INVALID_OPTIONS CliError`, () =>
        Effect.gen(function* () {
          yield* MockOutput.reset
          const error = yield* cli(args).pipe(Effect.flip)
          assertInstanceOf(error, CliError)
          expect(error.code).toBe('INVALID_OPTIONS')
          const output = yield* MockOutput.getStdout
          expect(output).toEqual([])
        }),
      )
    }

    it.effect('[Given] uuid -v 5 with a malformed --namespace [Then] fails with the library parse code', () =>
      Effect.gen(function* () {
        const error = yield* cli([
          'uuid',
          '-v',
          '5',
          '--name',
          'www.example.com',
          '--namespace',
          '6ba7b810-9dad-11d1-80b4-00c04fd430cz',
        ]).pipe(Effect.flip)
        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_CHAR')
        expect(error.hint).toContain('dns')
      }),
    )
  })
})

describe('CLI: uniku generate xid', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] count, JSON, and a timestamp [Then] generates canonical XIDs', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'xid', '--count', '2', '--timestamp', '1720000000000', '--json'])
        const output = yield* MockOutput.getStdout
        const ids = JSON.parse(output[0]) as string[]
        expect(ids).toHaveLength(2)
        expect(ids.every((id) => xid.isValid(id) && xid.timestamp(id) === 1_720_000_000_000)).toBe(true)
      }),
    )

    it.effect('[Given] root xid shorthand [Then] generates one XID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['xid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(xid.isValid(output[0])).toBe(true)
      }),
    )

    it.effect('[Given] malformed timestamp [Then] fails with the standard parse error', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'xid', '--timestamp', 'invalid']).pipe(Effect.flip)
        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
      }),
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
    it.effect('[Given] generate nanoid [Then] generates 1 nanoid (length=21)', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(21)
      }),
    )

    it.effect('[Given] generate nanoid --length 10 [Then] generates nanoid of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid', '--length', '10'])
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
        expect(error.hint).toBe('Provide a Unix timestamp in milliseconds or "now"')
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

    it.effect('[Given] generate objectid --timestamp <ms> [Then] embeds the given timestamp', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        const msecs = 1_720_000_000_000
        yield* cli(['generate', 'objectid', '--timestamp', String(msecs)])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        // Timestamp is the first 8 hex chars, big-endian seconds.
        const expectedPrefix = Math.floor(msecs / 1000)
          .toString(16)
          .padStart(8, '0')
        expect(output[0].slice(0, 8)).toBe(expectedPrefix)
      }),
    )

    it.effect('[Given] generate objectid --timestamp abc [Then] fails with a CliError', () =>
      Effect.gen(function* () {
        const error = yield* cli(['generate', 'objectid', '--timestamp', 'abc']).pipe(Effect.flip)

        assertInstanceOf(error, CliError)
        expect(error.code).toBe('INVALID_TIMESTAMP')
        expect(error.message).toBe('Invalid timestamp: "abc"')
        expect(error.hint).toBe('Provide a Unix timestamp in milliseconds or "now"')
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
        expect(error.code).toBe('NODE_BITS_OUT_OF_RANGE')
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
