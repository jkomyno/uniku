import * as HelpDoc from '@effect/cli/HelpDoc'
import * as ValidationError from '@effect/cli/ValidationError'
import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { CliError } from '@/src/domain/errors'
import { handleCliFailure } from '@/src/runtime/cli-failure'
import { MockOutput, TestLive } from '../__utils__'

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
    it.scoped('[Given] CliError without --json [Then] writes friendly stderr', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(
          new CliError(
            'INVALID_TIMESTAMP',
            'Invalid timestamp: "abc"',
            'Provide a Unix timestamp in milliseconds or "now"',
          ),
          ['node', '<CMD>', 'ulid'],
        )

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual(['Error: Invalid timestamp: "abc"\n  Provide a Unix timestamp in milliseconds or "now"'])
        expect(process.exitCode).toBe(1)
      }),
    )

    it.scoped('[Given] CliError with --json [Then] writes structured stderr', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(
          new CliError(
            'INVALID_TIMESTAMP',
            'Invalid timestamp: "abc"',
            'Provide a Unix timestamp in milliseconds or "now"',
          ),
          ['node', '<CMD>', 'ulid', '--json'],
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

    it.scoped('[Given] Effect CLI validation error [Then] leaves printed stderr alone', () =>
      Effect.gen(function* () {
        yield* resetExitCode
        yield* MockOutput.reset

        yield* handleCliFailure(ValidationError.invalidValue(HelpDoc.p('Unknown option: --wat')), [
          'node',
          '<CMD>',
          '--wat',
        ])

        const stderr = yield* MockOutput.getStderr
        expect(stderr).toEqual([])
        expect(process.exitCode).toBe(1)
      }),
    )
  })
})
