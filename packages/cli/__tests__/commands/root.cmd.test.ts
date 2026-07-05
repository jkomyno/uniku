import { describe, expect, layer } from '@effect/vitest'
import { assertTrue } from '@effect/vitest/utils'
import * as Effect from 'effect/Effect'
import { CliError as CliFrameworkError } from 'effect/unstable/cli'
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

        assertTrue(CliFrameworkError.isCliError(error))
        assertTrue(error._tag === 'ShowHelp')
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

        assertTrue(CliFrameworkError.isCliError(error))
        assertTrue(error._tag === 'ShowHelp')
        expect(error.errors).toHaveLength(1)
        expect(error.errors[0]._tag).toBe('UnknownSubcommand')
        expect(exitCodeFor(error)).toBe(1)

        const lines = yield* TestConsole.getLines({ stripAnsi: true })
        const output = lines.join('\n')
        expect(output).toContain('USAGE')
        expect(output).toContain('SUBCOMMANDS')
        expect(output).toContain('generate')
      }),
    )
  })
})
