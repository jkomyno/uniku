import { Command, Flag } from 'effect/cli'
import { UUID_VERSION_DEFAULT } from '@/src/domain/constants'
import { countFlag, jsonFlag, lowercaseFlag } from '../generate.flags'
import { runGenerateUuid } from './generate.uuid.handler'

const version = Flag.ChoiceWithValue('uuid-version', [
  ['4', 4],
  ['5', 5],
  ['7', 7],
] as const).pipe(
  Flag.withAlias('v'),
  Flag.withDescription('UUID version: 4, 5, 7'),
  Flag.withDefault(UUID_VERSION_DEFAULT as 4 | 5 | 7),
)

const name = Flag.String('name').pipe(
  Flag.withDescription('Name to derive a UUID v5 from (requires -v 5)'),
  Flag.optional,
)

const namespace = Flag.String('namespace').pipe(
  Flag.withDescription('UUID v5 namespace: dns, url, oid, x500, or a UUID (requires -v 5)'),
  Flag.optional,
)

export const generateCmd$Uuid = Command.make(
  'uuid',
  { count: countFlag, json: jsonFlag, version, lowercase: lowercaseFlag, name, namespace },
  runGenerateUuid,
).pipe(
  Command.withDescription('Generate UUIDs (v4, v5, or v7)'),
  Command.withExamples([
    { command: 'uniku uuid -n 5 --json', description: 'Generate 5 UUIDs as a JSON array (machine-readable)' },
    { command: 'uniku uuid -v 7', description: 'Generate a time-sortable UUID v7' },
    {
      command: 'uniku uuid -v 5 --namespace dns --name example.com',
      description: 'Derive the name-based UUID v5 for example.com',
    },
    { command: 'uniku uuid', description: 'Generate one random UUID v4' },
  ]),
)
