// Deep import: the package barrel pulls in modules that import the `bun`
// builtin, which does not exist under the Node-based vitest runner.
import * as BunServices from '@effect/platform-bun/BunServices'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as TestConsole from 'effect/testing/TestConsole'
import { OutputService } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import { UpdateCheckService } from '@/src/services/UpdateCheckService'
import * as MockOutput from './mock-output'
import * as MockStdin from './mock-stdin'
import * as MockUpdateCheck from './mock-update-check'

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
  Layer.unwrap(
    Effect.gen(function* () {
      const mockOutput = yield* MockOutput.make
      const mockUpdateCheck = yield* MockUpdateCheck.make

      return Layer.mergeAll(
        TestConsole.layer,
        Layer.succeed(OutputService, mockOutput.service),
        Layer.succeed(MockOutput.MockOutputTag, mockOutput.access),
        Layer.succeed(StdinService, MockStdin.fromLines(input?.stdinLines ?? [])),
        Layer.succeed(UpdateCheckService, mockUpdateCheck.service),
        Layer.succeed(MockUpdateCheck.MockUpdateCheckTag, mockUpdateCheck.access),
        BunServices.layer,
      )
    }),
  )
