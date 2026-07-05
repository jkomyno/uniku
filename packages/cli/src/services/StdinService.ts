import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { CliError } from '@/src/domain/errors'

export class StdinService extends Context.Service<
  StdinService,
  {
    readonly readLines: () => Effect.Effect<readonly string[], CliError>
  }
>()('uniku/cli/StdinService') {
  /**
   * Reads all lines from process.stdin until EOF.
   * Filters out empty lines.
   */
  static readonly layer = Layer.succeed(
    StdinService,
    StdinService.of({
      readLines: Effect.fn('StdinService.readLines')(() =>
        Effect.callback<readonly string[], CliError>((resume) => {
          const chunks: Buffer[] = []

          process.stdin.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
          })

          process.stdin.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8')
            const lines = text
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
            resume(Effect.succeed(lines))
          })

          process.stdin.on('error', (err) => {
            resume(Effect.fail(new CliError({ code: 'STDIN_ERROR', message: err.message })))
          })

          process.stdin.resume()
        }),
      ),
    }),
  )
}
