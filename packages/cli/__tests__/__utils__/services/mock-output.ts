import * as Array from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Ref from 'effect/Ref'
import type { CliFailure } from '@/src/domain/errors'
import type { InspectResult, ValidationResult } from '@/src/domain/types'
import {
  formatError,
  formatInspectHuman,
  formatValidationHuman,
  type OutputOptions,
  OutputService,
} from '@/src/services/OutputService'

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

export class MockOutputTag extends Context.Service<MockOutputTag, MockOutputAccess>()('test/MockOutput') {}

// =============================================================================
// Constructors
// =============================================================================

export const make = Effect.gen(function* () {
  const stdoutRef = yield* Ref.make<ReadonlyArray<string>>([])
  const stderrRef = yield* Ref.make<ReadonlyArray<string>>([])

  const service = OutputService.of({
    writeIds(ids: readonly string[], options: OutputOptions) {
      return Ref.update(stdoutRef, (lines) => {
        if (options.json) {
          const out = ids.length === 1 ? JSON.stringify(ids[0]) : JSON.stringify(ids)
          return Array.append(lines, out)
        }
        return Array.appendAll(lines, ids)
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

    writeError(error: CliFailure, options: OutputOptions) {
      return Ref.update(stderrRef, (lines) => Array.append(lines, formatError(error, options)))
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

export const getStdout = MockOutputTag.use((mock) => mock.getStdout())
export const getStderr = MockOutputTag.use((mock) => mock.getStderr())
export const reset = MockOutputTag.use((mock) => mock.reset())
