import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { CliError as CliFrameworkError } from 'effect/unstable/cli'
import { CliError, ValidationFailedError } from '@/src/domain/errors'
import { handleCliFailure } from '@/src/runtime/cli-failure'
import { MockOutput, TestConsole, TestLive } from '../__utils__'

const resetExitCode = Effect.gen(function* () {
  const previous = process.exitCode
  process.exitCode = undefined
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      process.exitCode = previous
    }),
  )
})

describe('CLI failure handling', () => {
  layer(TestLive())((it) => {
    it.effect('[Given] CliError without --json [Then] writes friendly stderr', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(
          new CliError({
            code: 'INVALID_TIMESTAMP',
            message: 'Invalid timestamp: "abc"',
            hint: 'Provide a Unix timestamp in milliseconds or "now"',
          }),
          ['ulid'],
        )

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual(['Error: Invalid timestamp: "abc"\n  Provide a Unix timestamp in milliseconds or "now"'])
        expect(process.exitCode).toBe(1)
      }),
    )

    it.effect('[Given] CliError with --json [Then] writes structured stderr', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(
          new CliError({
            code: 'INVALID_TIMESTAMP',
            message: 'Invalid timestamp: "abc"',
            hint: 'Provide a Unix timestamp in milliseconds or "now"',
          }),
          ['ulid', '--json'],
        )

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual([
          JSON.stringify({
            error: 'Invalid timestamp: "abc"',
            code: 'INVALID_TIMESTAMP',
            hint: 'Provide a Unix timestamp in milliseconds or "now"',
          }),
        ])
        expect(process.exitCode).toBe(1)
      }),
    )

    it.effect('[Given] ValidationFailedError [Then] writes stderr and exits with code 2', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(new ValidationFailedError({ message: 'One or more IDs are invalid' }), ['validate'])

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual(['Error: One or more IDs are invalid'])
        expect(process.exitCode).toBe(2)
      }),
    )

    it.effect('[Given] ShowHelp with parse errors [Then] leaves rendered output alone and exits 1', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        // Command.runWith renders help + errors itself before re-failing,
        // so the failure handler only maps the exit code.
        yield* handleCliFailure(
          new CliFrameworkError.ShowHelp({
            commandPath: ['uniku'],
            errors: [
              new CliFrameworkError.UnrecognizedOption({
                option: '--wat',
                command: ['uniku'],
                suggestions: [],
              }),
            ],
          }),
          ['--wat'],
        )

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual([])
        expect(process.exitCode).toBe(1)
      }),
    )

    it.effect('[Given] ShowHelp without errors [Then] exits 0 (help was requested)', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(new CliFrameworkError.ShowHelp({ commandPath: ['uniku'], errors: [] }), [])

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual([])
        expect(process.exitCode).toBe(0)
      }),
    )

    it.effect('[Given] a framework error not wrapped in ShowHelp [Then] renders it and exits 1', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        // Global-flag parse failures (e.g. --log-level bogus) escape
        // Command.runWith unrendered — the failure handler must not exit
        // silently.
        yield* handleCliFailure(
          new CliFrameworkError.InvalidValue({
            option: 'log-level',
            value: 'bogus',
            expected: 'one of: all, trace, debug, info, warn, warning, error, fatal, none',
            kind: 'flag',
          }),
          ['--log-level', 'bogus', 'uuid'],
        )

        const errorLines = yield* TestConsole.getErrorLines()
        expect(errorLines.join('\n')).toContain('Error:')
        expect(errorLines.join('\n')).toContain('log-level')
        expect(process.exitCode).toBe(1)
      }),
    )
  })
})
