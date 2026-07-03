import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { cli, MockConsole, MockOutput, TestLive } from '../__utils__'

const expectCliRejects = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    yield* MockOutput.reset
    const didSucceed = yield* cli(args).pipe(
      Effect.as(true),
      Effect.catchAll(() => Effect.succeed(false)),
    )
    expect(didSucceed).toBe(false)
  })

describe('CLI: uniku generate uuid', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] generate uuid [Then] generates 1 UUID v4', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.scoped('[Given] generate uuid -n 3 [Then] generates 3 UUIDs', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '-n', '3'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(3)
      }),
    )

    it.scoped('[Given] generate uuid -v 7 [Then] generates UUID v7', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '-v', '7'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.scoped('[Given] generate uuid --json [Then] outputs JSON string', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '--json'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.scoped('[Given] generate uuid --json -n 2 [Then] outputs JSON array', () =>
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

    it.scoped('[Given] generate uuid --lowercase [Then] output is lowercase', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'uuid', '--lowercase'])
        const output = yield* MockOutput.getStdout
        expect(output[0]).toBe(output[0].toLowerCase())
      }),
    )

    it.scoped('[Given] generate uuid -l [Then] rejects the removed lowercase alias', () =>
      expectCliRejects(['generate', 'uuid', '-l']),
    )
  })
})

describe('CLI: uniku generate ulid', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] generate ulid [Then] generates 1 ULID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ulid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
      }),
    )

    it.scoped('[Given] generate ulid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ulid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )

    it.scoped('[Given] generate ulid -l [Then] rejects the removed lowercase alias', () =>
      expectCliRejects(['generate', 'ulid', '-l']),
    )
  })
})

describe('CLI: uniku generate nanoid', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] generate nanoid [Then] generates 1 nanoid (size=21)', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(21)
      }),
    )

    it.scoped('[Given] generate nanoid --size 10 [Then] generates nanoid of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'nanoid', '--size', '10'])
        const output = yield* MockOutput.getStdout
        expect(output[0].length).toBe(10)
      }),
    )

    it.scoped('[Given] generate nanoid --alphabet hex [Then] output is hex chars only', () =>
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
    it.scoped('[Given] generate cuid [Then] generates 1 CUID (length=24)', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'cuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
      }),
    )

    it.scoped('[Given] generate cuid --length 10 [Then] generates CUID of length 10', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'cuid', '--length', '10'])
        const output = yield* MockOutput.getStdout
        expect(output[0].length).toBe(10)
      }),
    )

    it.scoped('[Given] generate cuid -l 10 [Then] generates CUID of length 10', () =>
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
    it.scoped('[Given] generate ksuid [Then] generates 1 KSUID', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ksuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(27)
        expect(output[0]).toMatch(/^[0-9A-Za-z]+$/)
      }),
    )

    it.scoped('[Given] generate ksuid --json [Then] outputs JSON', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['generate', 'ksuid', '--json'])
        const output = yield* MockOutput.getStdout
        const parsed = JSON.parse(output[0])
        expect(typeof parsed).toBe('string')
      }),
    )
  })
})

describe('CLI: shorthand commands', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] uniku uuid [Then] same as generate uuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.scoped('[Given] uniku uuid --uuid-version 7 [Then] generates UUID v7', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid', '--uuid-version', '7'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }),
    )

    it.scoped('[Given] uniku uuid --version [Then] prints CLI version', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['uuid', '--version'])
        const output = yield* MockOutput.getStdout
        const lines = yield* MockConsole.getLines({ stripAnsi: true })
        expect(output).toHaveLength(0)
        expect(lines.join('\n')).toContain('0.0.0-test')
      }),
    )

    it.scoped('[Given] uniku ulid [Then] same as generate ulid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['ulid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0]).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
      }),
    )

    it.scoped('[Given] uniku nanoid [Then] same as generate nanoid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['nanoid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(21)
      }),
    )

    it.scoped('[Given] uniku cuid [Then] same as generate cuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['cuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(24)
      }),
    )

    it.scoped('[Given] uniku ksuid [Then] same as generate ksuid', () =>
      Effect.gen(function* () {
        yield* MockOutput.reset
        yield* cli(['ksuid'])
        const output = yield* MockOutput.getStdout
        expect(output).toHaveLength(1)
        expect(output[0].length).toBe(27)
      }),
    )
  })
})
