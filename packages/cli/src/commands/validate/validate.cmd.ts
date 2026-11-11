import { Argument, Command, Flag } from 'effect/cli'
import { ID_GENERATORS } from '@/src/domain/types'
import { runValidate } from './validate.handler'

const id = Argument.String('id').pipe(Argument.withDescription('The ID to validate'), Argument.optional)

const type = Flag.Literals('type', ID_GENERATORS).pipe(
  Flag.withDescription('Expected ID type (auto-detected if omitted)'),
  Flag.optional,
)

const stdin = Flag.Boolean('stdin').pipe(
  Flag.withDescription('Read IDs from stdin (one per line)'),
  Flag.withDefault(false),
)

const json = Flag.Boolean('json').pipe(
  Flag.withDescription('Output validation results as JSON'),
  Flag.withDefault(false),
)

const quiet = Flag.Boolean('quiet').pipe(Flag.withDescription('No output, exit code only'), Flag.withDefault(false))

export const validateCmd = Command.make('validate', { id, type, stdin, json, quiet }, runValidate).pipe(
  Command.withDescription('Check if an ID is valid'),
  Command.withExamples([
    {
      command: 'uniku validate 3F2504E0-4F89-41D3-9A0C-0305E82C3301 --json',
      description: 'Validate one ID, result as JSON',
    },
    {
      command: 'cat ids.txt | uniku validate --stdin --json',
      description: 'Validate many IDs (one per line), results as a JSON array',
    },
    { command: 'uniku validate --quiet 01J9YR2V5TZB8Q4W6X0E1N7M3S', description: 'Exit code only: 0 valid, 2 invalid' },
  ]),
)
