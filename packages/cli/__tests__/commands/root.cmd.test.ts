import { describe, expect, layer } from '@effect/vitest'
import { assertInstanceOf } from '@effect/vitest/utils'
import { CliError as CliFrameworkError } from 'effect/cli'
import * as Effect from 'effect/Effect'
import { exitCodeFor } from '@/src/runtime/cli-failure'
import { cli, TestConsole, TestLive } from '../__utils__'

// Each test gets its own layer block so TestConsole starts empty — its
// captured lines accumulate for the lifetime of a layer.
describe('CLI: uniku root', () => {
  layer(TestLive())('--help', (it) => {
    it.effect('[Given] --help flag [Then] prints help text', () =>
      Effect.gen(function* () {
        yield* cli(['--help'])
        const lines = yield* TestConsole.getLines()
        const output = lines.join('\n')
        expect(output).toContain('uniku')
        expect(output).toContain('generate')
        expect(output).toContain('validate')
        expect(output).toContain('inspect')
      }),
    )
  })

  layer(TestLive())('global flags', (it) => {
    it.effect('[Given] --help flag [Then] lists the built-in global flags without --wizard', () =>
      Effect.gen(function* () {
        yield* cli(['--help'])
        const lines = yield* TestConsole.getLines({ stripAnsi: true })
        const output = lines.join('\n')
        expect(output).toContain('--completions')
        expect(output).toContain('--log-level')
        expect(output).not.toContain('--wizard')
      }),
    )
  })

  layer(TestLive())('--version', (it) => {
    it.effect('[Given] --version flag [Then] prints version', () =>
      Effect.gen(function* () {
        yield* cli(['--version'])
        const lines = yield* TestConsole.getLines()
        const output = lines.join('\n')
        expect(output).toContain('0.0.0-test')
      }),
    )
  })

  layer(TestLive())('bare invocation', (it) => {
    it.effect('[Given] no arguments [Then] shows help and maps to exit 0', () =>
      Effect.gen(function* () {
        const error = yield* cli([]).pipe(Effect.flip)

        assertInstanceOf(error, CliFrameworkError.ShowHelp)
        expect(error.errors).toHaveLength(0)
        expect(exitCodeFor(error)).toBe(0)

        const lines = yield* TestConsole.getLines({ stripAnsi: true })
        const output = lines.join('\n')
        expect(output).toContain('USAGE')
        expect(output).toContain('SUBCOMMANDS')
      }),
    )
  })

  layer(TestLive())('unknown subcommand', (it) => {
    it.effect('[Given] unknown subcommand [Then] fails with ShowHelp wrapping UnknownSubcommand', () =>
      Effect.gen(function* () {
        const error = yield* cli(['nonexistent']).pipe(Effect.flip)

        assertInstanceOf(error, CliFrameworkError.ShowHelp)
        expect(error.errors).toHaveLength(1)
        assertInstanceOf(error.errors[0], CliFrameworkError.UnknownSubcommand)
        expect(exitCodeFor(error)).toBe(1)

        const lines = yield* TestConsole.getLines({ stripAnsi: true })
        const output = lines.join('\n')
        expect(output).toContain('USAGE')
        expect(output).toContain('SUBCOMMANDS')
        expect(output).toContain('generate')
      }),
    )
  })

  layer(TestLive())('parse failures', (it) => {
    const parseFailure = (args: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const error = yield* cli(args).pipe(Effect.flip)
        assertInstanceOf(error, CliFrameworkError.ShowHelp)
        expect(error.errors).toHaveLength(1)
        expect(exitCodeFor(error)).toBe(1)
        return error.errors[0]
      })

    it.effect('[Given] an invalid global flag value [Then] fails with ShowHelp wrapping InvalidValue', () =>
      Effect.gen(function* () {
        assertInstanceOf(yield* parseFailure(['--log-level', 'bogus', 'uuid']), CliFrameworkError.InvalidValue)
      }),
    )

    it.effect('[Given] an extra positional argument [Then] fails with ShowHelp wrapping UnexpectedArgument', () =>
      Effect.gen(function* () {
        assertInstanceOf(yield* parseFailure(['uuid', 'extra']), CliFrameworkError.UnexpectedArgument)
      }),
    )

    it.effect('[Given] a repeated single-value flag [Then] fails with ShowHelp wrapping InvalidValue', () =>
      Effect.gen(function* () {
        assertInstanceOf(yield* parseFailure(['uuid', '-n', '2', '-n', '3']), CliFrameworkError.InvalidValue)
      }),
    )

    it.effect('[Given] a negative --count [Then] fails with ShowHelp instead of printing nothing', () =>
      Effect.gen(function* () {
        yield* parseFailure(['uuid', '-n', '-1'])
      }),
    )
  })
})
