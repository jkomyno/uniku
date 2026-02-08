/**
 * Build standalone CLI binary using Bun's --compile flag.
 *
 * Usage:
 *   bun scripts/build-binary.ts                                      # auto-detect platform
 *   bun scripts/build-binary.ts --target=bun-darwin-arm64            # cross-compile
 *   bun scripts/build-binary.ts --target=bun-darwin-arm64 --name=uniku-darwin-arm64
 */

import { Command } from '@effect/platform'
import { BunContext, BunRuntime } from '@effect/platform-bun'
import { Console, Effect } from 'effect'

// ── Platform detection ──────────────────────────────────────────────

function detectTarget(): string {
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `bun-${platform}-${arch}`
}

function targetToArtifactName(target: string): string {
  // bun-darwin-arm64 → uniku-darwin-arm64
  return target.replace(/^bun-/, 'uniku-')
}

// ── Arg parsing ─────────────────────────────────────────────────────

function parseArgs(argv: readonly string[]) {
  const args = argv.slice(2)

  let target: string | undefined
  let name: string | undefined

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      target = arg.slice('--target='.length)
    } else if (arg.startsWith('--name=')) {
      name = arg.slice('--name='.length)
    }
  }

  if (!target) {
    target = detectTarget()
  }

  if (!name) {
    name = targetToArtifactName(target)
  }

  return { target, name }
}

// ── Build steps ─────────────────────────────────────────────────────

const exec = (label: string, cmd: string, ...args: Array<string>) =>
  Effect.gen(function* () {
    yield* Console.log(`  ${label}`)

    const command = Command.make(cmd, ...args).pipe(Command.stdout('inherit'), Command.stderr('inherit'))

    const exitCode = yield* Command.exitCode(command)

    if (exitCode !== 0) {
      return yield* Effect.fail(new Error(`"${cmd} ${args.join(' ')}" exited with code ${exitCode}`))
    }
  })

const computeSha256 = (filePath: string) =>
  Effect.gen(function* () {
    const file = Bun.file(filePath)
    const buffer = yield* Effect.promise(() => file.arrayBuffer())
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(buffer)
    return hasher.digest('hex')
  })

// ── Main program ────────────────────────────────────────────────────

const program = Effect.gen(function* () {
  const { target, name } = parseArgs(process.argv)
  const outDir = 'dist'
  const outFile = `${outDir}/${name}`

  yield* Console.log(`Building CLI binary`)
  yield* Console.log(`  Target:   ${target}`)
  yield* Console.log(`  Output:   ${outFile}`)
  yield* Console.log('')

  // 1. Ensure output directory exists
  yield* exec('mkdir -p dist', 'mkdir', '-p', outDir)

  // 2. Compile binary
  yield* exec(
    `bun build --compile --target=${target}`,
    'bun',
    'build',
    './src/bin.ts',
    '--compile',
    '--minify',
    '--define',
    '__STANDALONE_BINARY__=true',
    `--target=${target}`,
    `--outfile=${outFile}`,
  )

  // 3. Create tarball
  const tarball = `${name}.tar.gz`
  yield* exec(`tar -czf ${tarball}`, 'tar', '-czf', `${outDir}/${tarball}`, '-C', outDir, name)

  // 4. Generate SHA256 checksum (using Bun crypto — platform-independent)
  const hash = yield* computeSha256(`${outDir}/${tarball}`)
  const checksumContent = `${hash}  ${tarball}\n`
  const checksumFile = `${outDir}/${tarball}.sha256`
  yield* Effect.promise(() => Bun.write(checksumFile, checksumContent))
  yield* Console.log(`  sha256: ${hash}`)

  yield* Console.log('')
  yield* Console.log(`Done: ${outDir}/${tarball}`)
})

// ── Run ─────────────────────────────────────────────────────────────

program.pipe(
  Effect.catchAll((err) =>
    Effect.sync(() => {
      process.stderr.write(`Build failed: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exitCode = 1
    }),
  ),
  Effect.provide(BunContext.layer),
  BunRuntime.runMain,
)
