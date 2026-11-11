import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import { generateUlid } from '@/src/generators/ulid'
import { idsOutput, OutputService } from '@/src/services/OutputService'
import { parseOptionalTimestampMs } from '../generate.parse'

export type GenerateUlidParams = {
  readonly count: number
  readonly json: boolean
  readonly monotonic: boolean
  readonly timestamp: Option.Option<string>
  readonly lowercase: boolean
}

export const runGenerateUlid = Effect.fn('cli.generate.ulid')(function* ({
  count,
  json,
  monotonic,
  timestamp: timestampInput,
  lowercase,
}: GenerateUlidParams) {
  const output = yield* OutputService
  const timestamp = yield* parseOptionalTimestampMs(timestampInput)
  const ids = yield* generateUlid({ count, monotonic, timestamp, lowercase })
  yield* output.write(idsOutput(ids), { json })
})
