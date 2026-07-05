import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import type { CliError as CliFrameworkError } from 'effect/unstable/cli'
import type { CliFailure } from '@/src/domain/errors'
import { errorOutput, OutputService } from '@/src/services/OutputService'

const EXIT_CODE_SUCCESS = 0
const EXIT_CODE_FAILURE = 1

/**
 * Every failure the CLI runner can produce: CLI-owned expected failures
 * plus the Effect CLI framework's parse/help errors.
 */
export type CliRunFailure = CliFailure | CliFrameworkError.CliError

function usesJsonOutput(args: readonly string[]): boolean {
  return args.includes('--json')
}

/**
 * Maps the full CLI failure union to a process exit code.
 *
 * `ShowHelp` is a success (exit 0) when help was requested explicitly
 * (no parse errors attached), a failure otherwise.
 */
export const exitCodeFor: (error: CliRunFailure) => number = Match.type<CliRunFailure>().pipe(
  Match.tag('CliError', (error) => error.exitCode),
  Match.tag('ValidationFailedError', (error) => error.exitCode),
  Match.tag('ShowHelp', (error) => (error.errors.length > 0 ? EXIT_CODE_FAILURE : EXIT_CODE_SUCCESS)),
  Match.tag(
    'UnrecognizedOption',
    'DuplicateOption',
    'MissingOption',
    'MissingArgument',
    'InvalidValue',
    'UnknownSubcommand',
    'UserError',
    () => EXIT_CODE_FAILURE,
  ),
  Match.exhaustive,
)

export const handleCliFailure = Effect.fn('cli.handleCliFailure')(function* (
  error: CliRunFailure,
  args: readonly string[],
) {
  yield* Match.value(error).pipe(
    // CLI-owned failures are written by us.
    Match.tag('CliError', 'ValidationFailedError', (failure) =>
      OutputService.use((output) => output.writeError(errorOutput(failure), { json: usesJsonOutput(args) })),
    ),
    // Command.runWith renders ShowHelp (and the parse errors it wraps) itself.
    Match.tag('ShowHelp', () => Effect.void),
    // Global-flag parse failures (e.g. --log-level bogus) escape Command.runWith
    // unrendered.
    Match.tag(
      'UnrecognizedOption',
      'DuplicateOption',
      'MissingOption',
      'MissingArgument',
      'InvalidValue',
      'UnknownSubcommand',
      'UserError',
      (failure) => Console.error(`Error: ${failure.message}`),
    ),
    Match.exhaustive,
  )
  process.exitCode = exitCodeFor(error)
})
