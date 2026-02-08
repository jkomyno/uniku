import { BunContext } from '@effect/platform-bun'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { OutputService } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import * as MockConsole from './mock-console'
import * as MockOutput from './mock-output'
import * as MockStdin from './mock-stdin'
import * as MockTerminal from './mock-terminal'

// =============================================================================
// Models
// =============================================================================

export interface TestLiveInput {
  readonly stdinLines?: readonly string[]
}

// =============================================================================
// Layer
// =============================================================================

export const TestLive = (input?: TestLiveInput) =>
  Effect.gen(function* () {
    const mockConsole = yield* MockConsole.effect
    const mockOutput = yield* MockOutput.make

    return Layer.mergeAll(
      Console.setConsole(mockConsole),
      MockTerminal.layer,
      Layer.succeed(OutputService, mockOutput.service),
      Layer.succeed(MockOutput.MockOutputTag, mockOutput.access),
      Layer.succeed(StdinService, MockStdin.fromLines(input?.stdinLines ?? [])),
      BunContext.layer,
    )
  }).pipe(Effect.scoped, Layer.unwrapEffect)
