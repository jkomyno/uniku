import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import { generateObjectid } from '@/src/generators/objectid'
import { idsOutput, OutputService } from '@/src/services/OutputService'
import { parseOptionalTimestampMs } from '../generate.parse'

export type GenerateObjectidParams = {
  readonly count: number
  readonly json: boolean
  readonly timestamp: Option.Option<string>
}

export const runGenerateObjectid = Effect.fn('cli.generate.objectid')(function* ({
  count,
  json,
  timestamp: timestampInput,
}: GenerateObjectidParams) {
  const output = yield* OutputService
  const timestamp = yield* parseOptionalTimestampMs(timestampInput)
  const ids = yield* generateObjectid({ count, timestamp })
  yield* output.write(idsOutput(ids), { json })
})
