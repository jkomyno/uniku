import { Command, Flag } from 'effect/cli'
import { countFlag, jsonFlag, timestampFlag } from '../generate.flags'
import { runGenerateTsid } from './generate.tsid.handler'

const node = Flag.String('node').pipe(Flag.withDescription('Node ID (0 to 2^node-bits - 1)'), Flag.optional)

const nodeBits = Flag.String('node-bits').pipe(
  Flag.withDescription('Number of bits allocated to the node ID (0-20, default 10)'),
  Flag.optional,
)

export const generateCmd$Tsid = Command.make(
  'tsid',
  { count: countFlag, json: jsonFlag, timestamp: timestampFlag, node, nodeBits },
  runGenerateTsid,
).pipe(
  Command.withDescription('Generate TSIDs (64-bit Snowflake-style, time-sorted)'),
  Command.withExamples([
    { command: 'uniku tsid -n 5 --json', description: 'Generate 5 TSIDs as a JSON array' },
    {
      command: 'uniku tsid --timestamp 1720000000000',
      description: 'Generate a TSID for a fixed Unix timestamp (ms)',
    },
    { command: 'uniku tsid --node 42 --node-bits 10', description: 'Generate a TSID for a fixed node ID' },
  ]),
)
