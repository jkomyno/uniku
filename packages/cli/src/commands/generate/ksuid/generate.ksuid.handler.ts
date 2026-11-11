import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import { generateKsuid } from '@/src/generators/ksuid'
import { idsOutput, OutputService } from '@/src/services/OutputService'
import { parseOptionalTimestampMs } from '../generate.parse'

export type GenerateKsuidParams = {
  readonly count: number
  readonly json: boolean
  readonly timestamp: Option.Option<string>
}

export const runGenerateKsuid = Effect.fn('cli.generate.ksuid')(function* ({
  count,
  json,
  timestamp: timestampInput,
}: GenerateKsuidParams) {
  const output = yield* OutputService
  const timestamp = yield* parseOptionalTimestampMs(timestampInput)
  const ids = yield* generateKsuid({ count, timestamp })
  yield* output.write(idsOutput(ids), { json })
})
