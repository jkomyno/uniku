/**
 * Install a locally-built uniku CLI binary to UNIKU_INSTALL_DIR (default: /usr/local/bin).
 *
 * Usage:
 *   bun scripts/install-binary.ts                  # install from dist/uniku-<platform>
 *   UNIKU_INSTALL_DIR=~/.local/bin bun scripts/install-binary.ts
 */

import { existsSync } from 'node:fs'
import * as BunRuntime from '@effect/platform-bun/BunRuntime'
import * as BunServices from '@effect/platform-bun/BunServices'
import { Console, Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { exec } from './exec'

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

function isWritable(dir: string): boolean {
  try {
    return Bun.spawnSync(['test', '-w', dir]).exitCode === 0
  } catch {
    return false
  }
}

// ── Main program ────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
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
  const runWithSudo = !isWritable(INSTALL_DIR)
  if (runWithSudo) {
    yield* Console.log('  Elevated permissions required')
    yield* exec(`sudo cp ${artifactName} → ${destPath}`, 'sudo', 'cp', binaryPath, destPath)
  } else {
    yield* exec(`cp ${artifactName} → ${destPath}`, 'cp', binaryPath, destPath)
  }

  // Make executable
  if (runWithSudo) {
    yield* exec('sudo chmod +x', 'sudo', 'chmod', '+x', destPath)
  } else {
    yield* exec('chmod +x', 'chmod', '+x', destPath)
  }

  // Strip macOS quarantine attribute
  if (process.platform === 'darwin') {
    const quarantine = ChildProcess.make('xattr', ['-d', 'com.apple.quarantine', destPath], {
      stdout: 'inherit',
      stderr: 'inherit',
    })
    yield* spawner.exitCode(quarantine).pipe(Effect.catch(() => Effect.succeed(0)))
  }

  yield* Console.log('')
  yield* Console.log(`Installed ${BINARY_NAME} to ${destPath}`)

  // Verify
  const version = yield* spawner.string(ChildProcess.make(destPath, ['--version']))
  yield* Console.log(`  Version: ${version.trim()}`)
})

// ── Run ─────────────────────────────────────────────────────────────

program.pipe(
  Effect.catch((err) =>
    Effect.sync(() => {
      process.stderr.write(`Install failed: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exitCode = 1
    }),
  ),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain,
)
