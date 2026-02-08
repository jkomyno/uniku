import { Args, Command, Options } from '@effect/cli'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { CliError } from '@/src/domain/errors'
import type { IdType } from '@/src/domain/types'
import { inspectId } from '@/src/inspectors/inspect'
import { OutputService } from '@/src/services/OutputService'

const idArg = Args.text({ name: 'id' }).pipe(Args.withDescription('The ID to inspect'))

const typeOption = Options.choice('type', ['uuid', 'ulid', 'nanoid', 'cuid', 'ksuid'] as const).pipe(
  Options.withDescription('ID type (auto-detected if omitted)'),
  Options.optional,
)

const jsonOption = Options.boolean('json').pipe(Options.withDescription('Output as JSON'), Options.withDefault(false))

export const inspectCommand = Command.make(
  'inspect',
  {
    id: idArg,
    type: typeOption,
    json: jsonOption,
  },
  ({ id, type: typeOpt, json }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const type: IdType | undefined = Option.isSome(typeOpt) ? Option.getOrThrow(typeOpt) : undefined

      const result = inspectId(id, type)
      if (!result) {
        yield* Effect.fail(
          new CliError(
            'UNKNOWN_ID_TYPE',
            `Could not identify ID type for: "${id}"`,
            'Use --type to specify the ID type',
          ),
        )
        return
      }

      yield* output.writeInspect(result, { json })
    }),
).pipe(Command.withDescription('Decode and inspect an ID'))
