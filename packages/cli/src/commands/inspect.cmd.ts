import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { Argument, Command, Flag } from 'effect/unstable/cli'
import { CliError } from '@/src/domain/errors'
import type { IdType } from '@/src/domain/types'
import { inspectId } from '@/src/inspectors/inspect'
import { decodePreprocessedArg } from '@/src/runtime/args'
import { inspectOutput, OutputService } from '@/src/services/OutputService'

const idArg = Argument.string('id').pipe(Argument.withDescription('The ID to inspect'))

const typeFlag = Flag.choice('type', ['uuid', 'ulid', 'nanoid', 'cuid', 'ksuid'] as const).pipe(
  Flag.withDescription('ID type (auto-detected if omitted)'),
  Flag.optional,
)

const jsonFlag = Flag.boolean('json').pipe(Flag.withDescription('Output as JSON'), Flag.withDefault(false))

export const inspectCommand = Command.make(
  'inspect',
  {
    id: idArg,
    type: typeFlag,
    json: jsonFlag,
  },
  Effect.fn('cli.inspect')(function* ({ id, type: typeOpt, json }) {
    const output = yield* OutputService
    const type: IdType | undefined = Option.getOrUndefined(typeOpt)
    const input = decodePreprocessedArg(id)

    const result = inspectId(input, type)
    if (!result) {
      return yield* new CliError({
        code: 'UNKNOWN_ID_TYPE',
        message: `Could not identify ID type for: "${input}"`,
        hint: 'Use --type to specify the ID type',
      })
    }

    yield* output.write(inspectOutput(result), { json })
  }),
).pipe(
  Command.withDescription('Decode and inspect an ID'),
  Command.withExamples([
    {
      command: 'uniku inspect 01J9YR2V5TZB8Q4W6X0E1N7M3S --json',
      description: 'Decode an ID to structured JSON (type, version, timestamp)',
    },
    { command: 'uniku inspect --type uuid 3F2504E0-4F89-41D3-9A0C-0305E82C3301', description: 'Skip auto-detection' },
    { command: 'uniku inspect -- --tricky-id', description: 'Inspect an ID that starts with a dash' },
  ]),
)
