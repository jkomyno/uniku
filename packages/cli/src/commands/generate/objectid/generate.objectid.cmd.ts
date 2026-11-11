import { Command } from 'effect/cli'
import { countFlag, jsonFlag, timestampFlag } from '../generate.flags'
import { runGenerateObjectid } from './generate.objectid.handler'

export const generateCmd$Objectid = Command.make(
  'objectid',
  { count: countFlag, json: jsonFlag, timestamp: timestampFlag },
  runGenerateObjectid,
).pipe(
  Command.withDescription('Generate MongoDB ObjectIDs'),
  Command.withExamples([
    { command: 'uniku objectid -n 5 --json', description: 'Generate 5 ObjectIDs as a JSON array' },
    {
      command: 'uniku objectid --timestamp 1720000000000',
      description: 'Generate an ObjectID for a fixed Unix timestamp (ms)',
    },
  ]),
)
