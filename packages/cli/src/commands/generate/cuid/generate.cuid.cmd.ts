import { Command, Flag } from 'effect/cli'
import { CUID_LENGTH_DEFAULT } from '@/src/domain/constants'
import { countFlag, jsonFlag } from '../generate.flags'
import { runGenerateCuid } from './generate.cuid.handler'

const length = Flag.Int('length').pipe(
  Flag.withAlias('l'),
  Flag.withDescription('Length of ID (2-32)'),
  Flag.withDefault(CUID_LENGTH_DEFAULT),
)

export const generateCmd$Cuid = Command.make(
  'cuid',
  { count: countFlag, json: jsonFlag, length },
  runGenerateCuid,
).pipe(
  Command.withDescription('Generate CUIDs (v2)'),
  Command.withExamples([
    { command: 'uniku cuid -n 5 --json', description: 'Generate 5 CUIDs as a JSON array' },
    { command: 'uniku cuid --length 10', description: 'Generate a 10-char CUID' },
  ]),
)
