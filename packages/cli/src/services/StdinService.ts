import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { CliError } from '@/src/domain/errors'

export class StdinService extends Context.Tag('StdinService')<
  StdinService,
  {
    readonly readLines: () => Effect.Effect<readonly string[], CliError>
  }
>() {}

/**
 * Reads all lines from process.stdin until EOF.
 * Filters out empty lines.
 */
export const StdinServiceLive = StdinService.of({
  readLines() {
    return Effect.async<readonly string[], CliError>((resume) => {
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
        resume(Effect.fail(new CliError('STDIN_ERROR', err.message)))
      })

      process.stdin.resume()
    })
  },
})
