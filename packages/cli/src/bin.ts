import { BunContext, BunRuntime } from '@effect/platform-bun'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { makeCliRunner } from '@/src/commands'
import { CliError } from '@/src/domain/errors'
import { OutputService, OutputServiceLive } from '@/src/services/OutputService'
import { StdinService, StdinServiceLive } from '@/src/services/StdinService'
import { UpdateCheckService, UpdateCheckServiceLive } from '@/src/services/UpdateCheckService'
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
  Layer.succeed(UpdateCheckService, UpdateCheckServiceLive),
)

const MainLayer = Layer.mergeAll(ServicesLayer, BunContext.layer)

// ── Run ─────────────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const updateCheck = yield* UpdateCheckService
  const args = preprocessArgs(process.argv)

  // Fork update check as a background fiber
  const fiber = yield* Effect.fork(updateCheck.check(pkg.version))

  // Run the main CLI command
  yield* Effect.suspend(() => cli(args)).pipe(
    Effect.catchAll((err) =>
      Effect.sync(() => {
        if (err instanceof CliError) {
          process.stderr.write(`Error: ${err.message}\n`)
          if (err.hint) {
            process.stderr.write(`  ${err.hint}\n`)
          }
          process.exitCode = err.exitCode
        } else {
          process.stderr.write(`Error: ${String(err)}\n`)
          process.exitCode = 1
        }
      }),
    ),
  )

  // After main command, join fiber with timeout
  const result = yield* Fiber.join(fiber).pipe(
    Effect.timeout(Duration.seconds(5)),
    Effect.catchAll(() => Effect.succeed(Option.none())),
  )

  // Show notification unless --json is active
  if (Option.isSome(result) && !args.includes('--json')) {
    yield* updateCheck.notify(result.value)
  }
})

program.pipe(Effect.provide(MainLayer), BunRuntime.runMain)
