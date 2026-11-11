import { Argument, Command, Flag } from 'effect/cli'
import { ID_GENERATORS } from '@/src/domain/types'
import { runInspect } from './inspect.handler'

const id = Argument.String('id').pipe(Argument.withDescription('The ID to inspect'))

const type = Flag.Literals('type', ID_GENERATORS).pipe(
  Flag.withDescription('ID type (auto-detected if omitted)'),
  Flag.optional,
)

const json = Flag.Boolean('json').pipe(Flag.withDescription('Output as JSON'), Flag.withDefault(false))

export const inspectCmd = Command.make('inspect', { id, type, json }, runInspect).pipe(
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
