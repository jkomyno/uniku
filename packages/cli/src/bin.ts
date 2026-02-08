import { BunContext, BunRuntime } from '@effect/platform-bun'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { makeCliRunner } from '@/src/commands'
import { CliError } from '@/src/domain/errors'
import { OutputService, OutputServiceLive } from '@/src/services/OutputService'
import { StdinService, StdinServiceLive } from '@/src/services/StdinService'
import pkg from '../package.json' with { type: 'json' }

// ── CLI runner ──────────────────────────────────────────────────────

const cli = makeCliRunner(pkg.version)

// ── Arg preprocessing ───────────────────────────────────────────────

export function preprocessArgs(argv: readonly string[]): string[] {
  const args = [...argv]

  // Replace -V with --version (Effect CLI doesn't alias -V by default)
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '-V') {
      args[i] = '--version'
    }
  }

  // If no command args beyond the executable path, inject --help
  // argv is typically: [bun, script.ts, ...userArgs]
  if (args.length <= 2) {
    args.push('--help')
  }

  return args
}

// ── Service layers ──────────────────────────────────────────────────

const ServicesLayer = Layer.mergeAll(
  Layer.succeed(OutputService, OutputServiceLive),
  Layer.succeed(StdinService, StdinServiceLive),
)

const MainLayer = Layer.mergeAll(ServicesLayer, BunContext.layer)

// ── Run ─────────────────────────────────────────────────────────────

Effect.suspend(() => cli(preprocessArgs(process.argv))).pipe(
  // Handle our CLI errors (CliError, ValidationFailedError) — these
  // are the only non-ValidationError errors our commands can produce.
  Effect.catchAll((err) =>
    Effect.sync(() => {
      if (err instanceof CliError) {
        process.stderr.write(`Error: ${err.message}\n`)
        if (err.hint) {
          process.stderr.write(`  ${err.hint}\n`)
        }
        process.exitCode = err.exitCode
      } else {
        // @effect/cli ValidationError variants are already handled
        // by Command.run internally (it prints help/usage).
        // This catches any remaining unexpected errors.
        process.stderr.write(`Error: ${String(err)}\n`)
        process.exitCode = 1
      }
    }),
  ),
  Effect.provide(MainLayer),
  BunRuntime.runMain,
)
