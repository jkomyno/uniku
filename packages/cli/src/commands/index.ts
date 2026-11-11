import { CliConfig, Command } from 'effect/cli'
import * as Effect from 'effect/Effect'
import { UnikuCliConfig } from '@/src/cli-config'
import { generateCmd, generateSubcommands } from './generate/generate.cmd'
import { inspectCmd } from './inspect/inspect.cmd'
import { validateCmd } from './validate/validate.cmd'

export const rootCmd = Command.make('uniku').pipe(
  Command.withDescription('Generate and validate unique identifiers'),
  Command.withExamples([
    { command: 'uniku uuid -n 5 --json', description: 'Generate 5 UUIDs as a JSON array (machine-readable)' },
    { command: 'uniku typeid --prefix user', description: 'Generate one user TypeID' },
    { command: 'uniku ulid', description: 'Generate one ULID' },
    { command: 'uniku inspect <id> --json', description: 'Decode an ID (type, version, timestamp) as JSON' },
    { command: 'cat ids.txt | uniku validate --stdin --json', description: 'Validate IDs from stdin, one per line' },
  ]),
  Command.withSubcommands([generateCmd, validateCmd, inspectCmd, ...generateSubcommands]),
)

export const makeCliRunner = (version: string) => {
  const run = Command.runWith(rootCmd, { version })
  return (args: ReadonlyArray<string>) => run(args).pipe(Effect.provideService(CliConfig.CliConfig, UnikuCliConfig))
}
