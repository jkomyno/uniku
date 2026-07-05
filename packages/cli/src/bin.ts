#!/usr/bin/env node

// Deep imports: the package barrel pulls in modules that import the `bun`
// builtin, which does not exist when the published bin runs under Node.
import * as BunRuntime from '@effect/platform-bun/BunRuntime'
import * as BunServices from '@effect/platform-bun/BunServices'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { makeCliRunner } from '@/src/commands'
import { preprocessArgs } from '@/src/runtime/args'
import { handleCliFailure } from '@/src/runtime/cli-failure'
import { OutputService } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import { shouldNotifyUpdate, UpdateCheckService } from '@/src/services/UpdateCheckService'
import pkg from '../package.json' with { type: 'json' }

// ── CLI runner ──────────────────────────────────────────────────────

const runCli = makeCliRunner(pkg.version)

// ── Service layers ──────────────────────────────────────────────────

const MainLayer = Layer.mergeAll(OutputService.layer, StdinService.layer, UpdateCheckService.layer, BunServices.layer)

// ── Run ─────────────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const updateCheck = yield* UpdateCheckService
  // Drop the executable and script path — Command.runWith takes user args only.
  const args = preprocessArgs(process.argv.slice(2))

  // Fork update check as a background fiber
  const fiber = yield* Effect.forkChild(updateCheck.check(pkg.version), { startImmediately: true })

  // Run the main CLI command
  yield* runCli(args).pipe(Effect.catch((error) => handleCliFailure(error, args)))

  // After the main command, wait briefly for the update check, then interrupt
  // it — v4's runtime keeps the process alive while fibers are suspended.
  const result = yield* Fiber.join(fiber).pipe(Effect.timeoutOption(Duration.millis(250)))
  yield* Fiber.interrupt(fiber)

  const update = Option.flatten(result)
  if (shouldNotifyUpdate(args, update)) {
    yield* updateCheck.notify(update.value)
  }
})

program.pipe(Effect.provide(MainLayer), BunRuntime.runMain)
