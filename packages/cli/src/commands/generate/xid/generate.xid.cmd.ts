import { Command } from 'effect/cli'
import { countFlag, jsonFlag, timestampFlag } from '../generate.flags'
import { runGenerateXid } from './generate.xid.handler'

export const generateCmd$Xid = Command.make(
  'xid',
  { count: countFlag, json: jsonFlag, timestamp: timestampFlag },
  runGenerateXid,
).pipe(
  Command.withDescription('Generate XIDs'),
  Command.withExamples([
    { command: 'uniku xid -n 5 --json', description: 'Generate 5 XIDs as a JSON array' },
    {
      command: 'uniku xid --timestamp 1720000000000',
      description: 'Generate an XID for a fixed Unix timestamp (ms)',
    },
  ]),
)
