import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import { generateXid } from '@/src/generators/xid'
import { idsOutput, OutputService } from '@/src/services/OutputService'
import { parseOptionalTimestampMs } from '../generate.parse'

export type GenerateXidParams = {
  readonly count: number
  readonly json: boolean
  readonly timestamp: Option.Option<string>
}

export const runGenerateXid = Effect.fn('cli.generate.xid')(function* ({
  count,
  json,
  timestamp: timestampInput,
}: GenerateXidParams) {
  const output = yield* OutputService
  const timestamp = yield* parseOptionalTimestampMs(timestampInput)
  const ids = yield* generateXid({ count, timestamp })
  yield* output.write(idsOutput(ids), { json })
})
