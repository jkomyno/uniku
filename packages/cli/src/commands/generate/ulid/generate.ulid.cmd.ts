import { Command, Flag } from 'effect/cli'
import { countFlag, jsonFlag, lowercaseFlag, timestampFlag } from '../generate.flags'
import { runGenerateUlid } from './generate.ulid.handler'

const monotonic = Flag.Boolean('monotonic').pipe(
  Flag.withDescription('Generate monotonically increasing ULIDs'),
  Flag.withDefault(false),
)

export const generateCmd$Ulid = Command.make(
  'ulid',
  { count: countFlag, json: jsonFlag, monotonic, timestamp: timestampFlag, lowercase: lowercaseFlag },
  runGenerateUlid,
).pipe(
  Command.withDescription('Generate ULIDs'),
  Command.withExamples([
    {
      command: 'uniku ulid -n 10 --monotonic --json',
      description: 'Generate 10 strictly ordered ULIDs as a JSON array',
    },
    { command: 'uniku ulid --timestamp 1720000000000', description: 'Generate a ULID for a fixed Unix timestamp (ms)' },
  ]),
)
