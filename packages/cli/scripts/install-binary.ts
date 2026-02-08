/**
 * Install a locally-built uniku CLI binary to UNIKU_INSTALL_DIR (default: /usr/local/bin).
 *
 * Usage:
 *   bun scripts/install-binary.ts                  # install from dist/uniku-<platform>
 *   UNIKU_INSTALL_DIR=~/.local/bin bun scripts/install-binary.ts
 */

import { existsSync } from 'node:fs'
import { Command } from '@effect/platform'
import { BunContext, BunRuntime } from '@effect/platform-bun'
import { Console, Effect } from 'effect'

// ── Constants ───────────────────────────────────────────────────────

const BINARY_NAME = 'uniku'
const INSTALL_DIR = process.env.UNIKU_INSTALL_DIR ?? '/usr/local/bin'

// ── Platform detection ──────────────────────────────────────────────

function detectArtifactName(): string {
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `${BINARY_NAME}-${platform}-${arch}`
}

// ── Helpers ─────────────────────────────────────────────────────────

const exec = (label: string, cmd: string, ...args: Array<string>) =>
  Effect.gen(function* () {
    yield* Console.log(`  ${label}`)

    const command = Command.make(cmd, ...args).pipe(Command.stdout('inherit'), Command.stderr('inherit'))

    const exitCode = yield* Command.exitCode(command)

    if (exitCode !== 0) {
      return yield* Effect.fail(new Error(`"${cmd} ${args.join(' ')}" exited with code ${exitCode}`))
    }
  })

function isWritable(dir: string): boolean {
  try {
    Bun.spawnSync(['test', '-w', dir])
    return Bun.spawnSync(['test', '-w', dir]).exitCode === 0
  } catch {
    return false
  }
}

// ── Main program ────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const artifactName = detectArtifactName()
  const binaryPath = `dist/${artifactName}`
  const destPath = `${INSTALL_DIR}/${BINARY_NAME}`

  yield* Console.log('Installing uniku CLI binary')
  yield* Console.log(`  Source:  ${binaryPath}`)
  yield* Console.log(`  Target:  ${destPath}`)
  yield* Console.log('')

  // Check the binary exists
  if (!existsSync(binaryPath)) {
    return yield* Effect.fail(new Error(`Binary not found at ${binaryPath}. Run "bun scripts/build-binary.ts" first.`))
  }

  // Ensure install directory exists
  yield* exec(`mkdir -p ${INSTALL_DIR}`, 'mkdir', '-p', INSTALL_DIR)

  // Copy binary — use sudo if the directory is not writable
  if (isWritable(INSTALL_DIR)) {
    yield* exec(`cp ${artifactName} → ${destPath}`, 'cp', binaryPath, destPath)
  } else {
    yield* Console.log('  Elevated permissions required')
    yield* exec(`sudo cp ${artifactName} → ${destPath}`, 'sudo', 'cp', binaryPath, destPath)
  }

  // Make executable
  yield* exec('chmod +x', 'chmod', '+x', destPath)

  // Strip macOS quarantine attribute
  if (process.platform === 'darwin') {
    yield* Effect.gen(function* () {
      const cmd = Command.make('xattr', '-d', 'com.apple.quarantine', destPath).pipe(
        Command.stdout('inherit'),
        Command.stderr('inherit'),
      )
      yield* Command.exitCode(cmd).pipe(Effect.catchAll(() => Effect.succeed(0)))
    })
  }

  yield* Console.log('')
  yield* Console.log(`Installed ${BINARY_NAME} to ${destPath}`)

  // Verify
  const version = yield* Command.make(destPath, '--version').pipe(Command.string)
  yield* Console.log(`  Version: ${version.trim()}`)
})

// ── Run ─────────────────────────────────────────────────────────────

program.pipe(
  Effect.catchAll((err) =>
    Effect.sync(() => {
      process.stderr.write(`Install failed: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exitCode = 1
    }),
  ),
  Effect.provide(BunContext.layer),
  BunRuntime.runMain,
)
