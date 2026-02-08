import { Args, Command, Options } from '@effect/cli'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { CliError, ValidationFailedError } from '@/src/domain/errors'
import type { IdType, ValidationResult } from '@/src/domain/types'
import { OutputService } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import { validateAs, validateAutoDetect } from '@/src/validators/validate'

const idArg = Args.text({ name: 'id' }).pipe(Args.withDescription('The ID to validate'), Args.optional)

const typeOption = Options.choice('type', ['uuid', 'ulid', 'nanoid', 'cuid', 'ksuid'] as const).pipe(
  Options.withDescription('Expected ID type (auto-detected if omitted)'),
  Options.optional,
)

const stdinOption = Options.boolean('stdin').pipe(
  Options.withDescription('Read IDs from stdin (one per line)'),
  Options.withDefault(false),
)

const jsonOption = Options.boolean('json').pipe(
  Options.withDescription('Output validation results as JSON'),
  Options.withDefault(false),
)

const quietOption = Options.boolean('quiet').pipe(
  Options.withDescription('No output, exit code only'),
  Options.withDefault(false),
)

export const validateCommand = Command.make(
  'validate',
  {
    id: idArg,
    type: typeOption,
    stdin: stdinOption,
    json: jsonOption,
    quiet: quietOption,
  },
  ({ id: idOpt, type: typeOpt, stdin, json, quiet }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const stdinService = yield* StdinService
      const type: IdType | undefined = Option.isSome(typeOpt) ? Option.getOrThrow(typeOpt) : undefined

      let ids: readonly string[]

      if (stdin) {
        ids = yield* stdinService.readLines()
        if (ids.length === 0) {
          yield* Effect.fail(new CliError('NO_INPUT', 'No IDs provided on stdin'))
          return
        }
      } else if (Option.isSome(idOpt)) {
        ids = [Option.getOrThrow(idOpt)]
      } else {
        yield* Effect.fail(new CliError('NO_INPUT', 'No ID provided', 'Pass an ID as argument or use --stdin'))
        return
      }

      const results: ValidationResult[] = ids.map((id) => (type ? validateAs(id, type) : validateAutoDetect(id)))

      yield* output.writeValidation(results, { json, quiet })

      const hasInvalid = results.some((r) => !r.valid)
      if (hasInvalid) {
        yield* Effect.fail(new ValidationFailedError('One or more IDs are invalid'))
      }
    }),
).pipe(Command.withDescription('Check if an ID is valid'))
