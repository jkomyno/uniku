import * as Array from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Ref from 'effect/Ref'
import { OutputService, render } from '@/src/services/OutputService'

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

/**
 * Captures the real rendering (one entry per output record) instead of
 * writing to the process streams.
 */
export const make = Effect.gen(function* () {
  const stdoutRef = yield* Ref.make<ReadonlyArray<string>>([])
  const stderrRef = yield* Ref.make<ReadonlyArray<string>>([])

  const service = OutputService.of({
    write: (value, options) => Ref.update(stdoutRef, (lines) => Array.appendAll(lines, render(value, options))),
    writeError: (value, options) => Ref.update(stderrRef, (lines) => Array.appendAll(lines, render(value, options))),
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
