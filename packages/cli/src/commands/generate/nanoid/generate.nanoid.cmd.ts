import { Command, Flag } from 'effect/cli'
import { NANOID_LENGTH_DEFAULT } from '@/src/domain/constants'
import { countFlag, jsonFlag } from '../generate.flags'
import { runGenerateNanoid } from './generate.nanoid.handler'

const length = Flag.Int('length').pipe(
  Flag.withAlias('l'),
  Flag.withDescription('Length of ID (1-256)'),
  Flag.withDefault(NANOID_LENGTH_DEFAULT),
)

const alphabet = Flag.String('alphabet').pipe(
  Flag.withAlias('a'),
  Flag.withDescription('Custom alphabet or preset: hex, numeric, alpha'),
  Flag.optional,
)

export const generateCmd$Nanoid = Command.make(
  'nanoid',
  { count: countFlag, json: jsonFlag, length, alphabet },
  runGenerateNanoid,
).pipe(
  Command.withDescription('Generate Nanoids'),
  Command.withExamples([
    { command: 'uniku nanoid -n 5 --json', description: 'Generate 5 Nanoids as a JSON array' },
    { command: 'uniku nanoid --length 10 --alphabet hex', description: 'Generate a 10-char ID from the hex preset' },
  ]),
)
