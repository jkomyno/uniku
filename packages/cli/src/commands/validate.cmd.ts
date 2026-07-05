import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { Argument, Command, Flag } from 'effect/unstable/cli'
import { CliError, ValidationFailedError } from '@/src/domain/errors'
import type { IdType, ValidationResult } from '@/src/domain/types'
import { decodePreprocessedArg } from '@/src/runtime/args'
import { OutputService } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import { validateAs, validateAutoDetect } from '@/src/validators/validate'

const idArg = Argument.string('id').pipe(Argument.withDescription('The ID to validate'), Argument.optional)

const typeFlag = Flag.choice('type', ['uuid', 'ulid', 'nanoid', 'cuid', 'ksuid'] as const).pipe(
  Flag.withDescription('Expected ID type (auto-detected if omitted)'),
  Flag.optional,
)

const stdinFlag = Flag.boolean('stdin').pipe(
  Flag.withDescription('Read IDs from stdin (one per line)'),
  Flag.withDefault(false),
)

const jsonFlag = Flag.boolean('json').pipe(
  Flag.withDescription('Output validation results as JSON'),
  Flag.withDefault(false),
)

const quietFlag = Flag.boolean('quiet').pipe(Flag.withDescription('No output, exit code only'), Flag.withDefault(false))

export const validateCommand = Command.make(
  'validate',
  {
    id: idArg,
    type: typeFlag,
    stdin: stdinFlag,
    json: jsonFlag,
    quiet: quietFlag,
  },
  Effect.fn('cli.validate')(function* ({ id: idOpt, type: typeOpt, stdin, json, quiet }) {
    const output = yield* OutputService
    const stdinService = yield* StdinService
    const type: IdType | undefined = Option.getOrUndefined(typeOpt)

    let ids: readonly string[]

    if (stdin) {
      ids = yield* stdinService.readLines()
      if (ids.length === 0) {
        return yield* new CliError({ code: 'NO_INPUT', message: 'No IDs provided on stdin' })
      }
    } else if (Option.isSome(idOpt)) {
      ids = [decodePreprocessedArg(idOpt.value)]
    } else {
      return yield* new CliError({
        code: 'NO_INPUT',
        message: 'No ID provided',
        hint: 'Pass an ID as argument or use --stdin',
      })
    }

    const results: ValidationResult[] = ids.map((id) => (type ? validateAs(id, type) : validateAutoDetect(id)))

    yield* output.writeValidation(results, { json, quiet })

    const hasInvalid = results.some((r) => !r.valid)
    if (hasInvalid) {
      return yield* new ValidationFailedError({ message: 'One or more IDs are invalid' })
    }
  }),
).pipe(Command.withDescription('Check if an ID is valid'))
