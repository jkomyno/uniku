import * as Array from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Ref from 'effect/Ref'
import type { CliError } from '@/src/domain/errors'
import type { InspectResult, ValidationResult } from '@/src/domain/types'
import { type OutputOptions, OutputService } from '@/src/services/OutputService'

// =============================================================================
// Models
// =============================================================================

export interface MockOutputAccess {
  readonly getStdout: () => Effect.Effect<ReadonlyArray<string>>
  readonly getStderr: () => Effect.Effect<ReadonlyArray<string>>
  readonly reset: () => Effect.Effect<void>
}

// =============================================================================
// Context Tag
// =============================================================================

export class MockOutputTag extends Context.Tag('test/MockOutput')<MockOutputTag, MockOutputAccess>() {}

// =============================================================================
// Constructors
// =============================================================================

export const make = Effect.gen(function* () {
  const stdoutRef = yield* Ref.make<string[]>([])
  const stderrRef = yield* Ref.make<string[]>([])

  const service = OutputService.of({
    writeIds(ids: readonly string[], options: OutputOptions) {
      return Ref.update(stdoutRef, (lines) => {
        if (options.json) {
          const out = ids.length === 1 ? JSON.stringify(ids[0]) : JSON.stringify(ids)
          return Array.append(lines, out)
        }
        return Array.appendAll(lines, ids as string[])
      })
    },

    writeValidation(results: readonly ValidationResult[], options: OutputOptions) {
      if (options.quiet) return Effect.void
      return Ref.update(stdoutRef, (lines) => {
        if (options.json) {
          const out = results.length === 1 ? JSON.stringify(results[0]) : JSON.stringify(results)
          return Array.append(lines, out)
        }
        return Array.appendAll(
          lines,
          results.map((r) => formatValidationHuman(r)),
        )
      })
    },

    writeInspect(result: InspectResult, options: OutputOptions) {
      return Ref.update(stdoutRef, (lines) => {
        if (options.json) {
          return Array.append(lines, JSON.stringify(result))
        }
        return Array.append(lines, formatInspectHuman(result))
      })
    },

    writeError(error: CliError, options: OutputOptions) {
      return Ref.update(stderrRef, (lines) => {
        if (options.json) {
          const obj: Record<string, string> = { error: error.message, code: error.code }
          if (error.hint) obj.hint = error.hint
          return Array.append(lines, JSON.stringify(obj))
        }
        let msg = `Error: ${error.message}`
        if (error.hint) msg += `\n  ${error.hint}`
        return Array.append(lines, msg)
      })
    },
  })

  const access: MockOutputAccess = {
    getStdout: () => Ref.get(stdoutRef),
    getStderr: () => Ref.get(stderrRef),
    reset: () => Effect.all([Ref.set(stdoutRef, []), Ref.set(stderrRef, [])]).pipe(Effect.asVoid),
  }

  return { service, access }
})

// =============================================================================
// Accessors
// =============================================================================

export const getStdout = Effect.flatMap(MockOutputTag, (mock) => mock.getStdout())
export const getStderr = Effect.flatMap(MockOutputTag, (mock) => mock.getStderr())
export const reset = Effect.flatMap(MockOutputTag, (mock) => mock.reset())

// =============================================================================
// Helpers (match OutputServiceLive formatting)
// =============================================================================

function formatValidationHuman(result: ValidationResult): string {
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

function formatInspectHuman(result: InspectResult): string {
  const lines: string[] = []
  const typeLabel = result.version != null ? `${result.type} (v${result.version})` : result.type
  lines.push(`Type:      ${typeLabel}`)
  if (result.timestamp) lines.push(`Timestamp: ${result.timestamp}`)
  if (result.random) lines.push(`Random:    ${result.random}`)
  if (result.note) lines.push(`Note: ${result.note}`)
  return lines.join('\n')
}
