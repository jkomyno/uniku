import { Command } from 'effect/unstable/cli'
import {
  cuidShorthand,
  generateCommand,
  ksuidShorthand,
  nanoidShorthand,
  objectidShorthand,
  tsidShorthand,
  typeidShorthand,
  ulidShorthand,
  uuidShorthand,
  xidShorthand,
} from '@/src/commands/generate.cmd'
import { inspectCommand } from '@/src/commands/inspect.cmd'
import { validateCommand } from '@/src/commands/validate.cmd'

// ── Root command ────────────────────────────────────────────────────

export const rootCommand = Command.make('uniku').pipe(
  Command.withDescription('Generate and validate unique identifiers'),
  Command.withExamples([
    { command: 'uniku uuid -n 5 --json', description: 'Generate 5 UUIDs as a JSON array (machine-readable)' },
    { command: 'uniku typeid --prefix user', description: 'Generate one user TypeID' },
    { command: 'uniku ulid', description: 'Generate one ULID' },
    { command: 'uniku inspect <id> --json', description: 'Decode an ID (type, version, timestamp) as JSON' },
    { command: 'cat ids.txt | uniku validate --stdin --json', description: 'Validate IDs from stdin, one per line' },
  ]),
  Command.withSubcommands([
    generateCommand,
    validateCommand,
    inspectCommand,
    // Shorthand commands: `uniku uuid` = `uniku generate uuid`
    uuidShorthand,
    ulidShorthand,
    typeidShorthand,
    nanoidShorthand,
    cuidShorthand,
    ksuidShorthand,
    objectidShorthand,
    xidShorthand,
    tsidShorthand,
  ]),
)

// ── CLI runner (reusable for testing) ───────────────────────────────

export const makeCliRunner = (version: string) => Command.runWith(rootCommand, { version })
