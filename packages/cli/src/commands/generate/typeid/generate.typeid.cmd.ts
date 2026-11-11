import { Command, Flag } from 'effect/cli'
import { countFlag, jsonFlag } from '../generate.flags'
import { runGenerateTypeid } from './generate.typeid.handler'

const prefix = Flag.String('prefix').pipe(
  Flag.withAlias('p'),
  Flag.withDescription('Type prefix, e.g. "user" for user_... (empty by default)'),
  Flag.withDefault(''),
)

export const generateCmd$Typeid = Command.make(
  'typeid',
  { count: countFlag, json: jsonFlag, prefix },
  runGenerateTypeid,
).pipe(
  Command.withDescription('Generate TypeIDs'),
  Command.withExamples([
    { command: 'uniku typeid --prefix user', description: 'Generate a TypeID such as user_...' },
    { command: 'uniku typeid -p api_key -n 5 --json', description: 'Generate 5 api_key TypeIDs as JSON' },
    { command: 'uniku typeid', description: 'Generate a canonical prefixless TypeID' },
  ]),
)
