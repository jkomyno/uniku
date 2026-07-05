import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { type CliFailure, errorToJson } from '@/src/domain/errors'
import type { InspectResult, ValidationResult } from '@/src/domain/types'

export type OutputOptions = {
  readonly json?: boolean
  readonly quiet?: boolean
}

export class OutputService extends Context.Service<
  OutputService,
  {
    readonly writeIds: (ids: readonly string[], options: OutputOptions) => Effect.Effect<void>
    readonly writeValidation: (results: readonly ValidationResult[], options: OutputOptions) => Effect.Effect<void>
    readonly writeInspect: (result: InspectResult, options: OutputOptions) => Effect.Effect<void>
    readonly writeError: (error: CliFailure, options: OutputOptions) => Effect.Effect<void>
  }
>()('uniku/cli/OutputService') {
  /**
   * Default implementation writing to process.stdout / process.stderr.
   */
  static readonly layer = Layer.succeed(
    OutputService,
    OutputService.of({
      writeIds(ids, options) {
        return Effect.sync(() => {
          if (options.json) {
            const out = ids.length === 1 ? JSON.stringify(ids[0]) : JSON.stringify(ids)
            process.stdout.write(`${out}\n`)
          } else {
            for (const id of ids) {
              process.stdout.write(`${id}\n`)
            }
          }
        })
      },

      writeValidation(results, options) {
        return Effect.sync(() => {
          if (options.quiet) return

          if (options.json) {
            const out = results.length === 1 ? JSON.stringify(results[0]) : JSON.stringify(results)
            process.stdout.write(`${out}\n`)
          } else {
            for (const result of results) {
              process.stdout.write(`${formatValidationHuman(result)}\n`)
            }
          }
        })
      },

      writeInspect(result, options) {
        return Effect.sync(() => {
          if (options.json) {
            process.stdout.write(`${JSON.stringify(result)}\n`)
          } else {
            process.stdout.write(`${formatInspectHuman(result)}\n`)
          }
        })
      },

      writeError(error, options) {
        return Effect.sync(() => {
          process.stderr.write(`${formatError(error, options)}\n`)
        })
      },
    }),
  )
}

export function formatValidationHuman(result: ValidationResult): string {
  if (result.valid) {
    const parts = [`valid (${result.type}`]
    if (result.version != null) {
      parts.push(` v${result.version}`)
    }
    parts.push(')')
    return parts.join('')
  }
  return `invalid: ${result.error ?? 'malformed identifier'}`
}

export function formatInspectHuman(result: InspectResult): string {
  const lines: string[] = []
  const typeLabel = result.version != null ? `${result.type} (v${result.version})` : result.type
  lines.push(`Type:      ${typeLabel}`)
  if (result.timestamp) {
    lines.push(`Timestamp: ${result.timestamp}`)
  }
  if (result.random) {
    lines.push(`Random:    ${result.random}`)
  }
  if (result.note) {
    lines.push(`Note: ${result.note}`)
  }
  return lines.join('\n')
}

export function formatError(error: CliFailure, options: OutputOptions): string {
  if (options.json) {
    return JSON.stringify(errorToJson(error))
  }

  let msg = `Error: ${error.message}`
  if (error.hint) {
    msg += `\n  ${error.hint}`
  }
  return msg
}
