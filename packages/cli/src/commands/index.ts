import { Command } from '@effect/cli'
import {
  cuidShorthand,
  generateCommand,
  ksuidShorthand,
  nanoidShorthand,
  ulidShorthand,
  uuidShorthand,
} from '@/src/commands/generate.cmd'
import { inspectCommand } from '@/src/commands/inspect.cmd'
import { validateCommand } from '@/src/commands/validate.cmd'

// ── Root command ────────────────────────────────────────────────────

export const rootCommand = Command.make('uniku').pipe(
  Command.withDescription('Generate and validate unique identifiers'),
  Command.withSubcommands([
    generateCommand,
    validateCommand,
    inspectCommand,
    // Shorthand commands: `uniku uuid` = `uniku generate uuid`
    uuidShorthand,
    ulidShorthand,
    nanoidShorthand,
    cuidShorthand,
    ksuidShorthand,
  ]),
)

// ── CLI runner (reusable for testing) ───────────────────────────────

export const makeCliRunner = (version: string) =>
  Command.run(rootCommand, {
    name: 'uniku',
    version,
  })
