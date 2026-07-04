import * as ValidationError from '@effect/cli/ValidationError'
import * as Effect from 'effect/Effect'
import { CliError } from '@/src/domain/errors'
import { OutputService } from '@/src/services/OutputService'

const EXIT_CODE_FAILURE = 1

function usesJsonOutput(args: readonly string[]): boolean {
  return args.includes('--json')
}

export function handleCliFailure(error: unknown, args: readonly string[]): Effect.Effect<void, never, OutputService> {
  if (error instanceof CliError) {
    return Effect.gen(function* () {
      const output = yield* OutputService
      yield* output.writeError(error, { json: usesJsonOutput(args) })
      process.exitCode = error.exitCode
    })
  }

  if (ValidationError.isValidationError(error)) {
    return Effect.sync(() => {
      process.exitCode = EXIT_CODE_FAILURE
    })
  }

  return Effect.sync(() => {
    process.stderr.write(`Error: ${formatUnknownError(error)}\n`)
    process.exitCode = EXIT_CODE_FAILURE
  })
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
