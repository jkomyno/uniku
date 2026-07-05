import { Console, Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

/**
 * Run a command with inherited stdio, failing when it exits non-zero.
 */
export const exec = (label: string, cmd: string, ...args: Array<string>) =>
  Effect.gen(function* () {
    yield* Console.log(`  ${label}`)

    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const command = ChildProcess.make(cmd, args, { stdout: 'inherit', stderr: 'inherit' })
    const exitCode = yield* spawner.exitCode(command)

    if (exitCode !== 0) {
      return yield* Effect.fail(new Error(`"${cmd} ${args.join(' ')}" exited with code ${exitCode}`))
    }
  })
