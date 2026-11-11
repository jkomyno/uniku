import { Command } from 'effect/cli'
import { countFlag, jsonFlag, timestampFlag } from '../generate.flags'
import { runGenerateKsuid } from './generate.ksuid.handler'

export const generateCmd$Ksuid = Command.make(
  'ksuid',
  { count: countFlag, json: jsonFlag, timestamp: timestampFlag },
  runGenerateKsuid,
).pipe(
  Command.withDescription('Generate KSUIDs'),
  Command.withExamples([
    { command: 'uniku ksuid -n 5 --json', description: 'Generate 5 KSUIDs as a JSON array' },
    {
      command: 'uniku ksuid --timestamp 1720000000000',
      description: 'Generate a KSUID for a fixed Unix timestamp (ms)',
    },
  ]),
)
