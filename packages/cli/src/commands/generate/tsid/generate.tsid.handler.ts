import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import { generateTsid } from '@/src/generators/tsid'
import { idsOutput, OutputService } from '@/src/services/OutputService'
import { parseOptionalNode, parseOptionalNodeBits, parseOptionalTimestampMs } from '../generate.parse'

export type GenerateTsidParams = {
  readonly count: number
  readonly json: boolean
  readonly timestamp: Option.Option<string>
  readonly node: Option.Option<string>
  readonly nodeBits: Option.Option<string>
}

export const runGenerateTsid = Effect.fn('cli.generate.tsid')(function* ({
  count,
  json,
  timestamp: timestampInput,
  node: nodeInput,
  nodeBits: nodeBitsInput,
}: GenerateTsidParams) {
  const output = yield* OutputService
  const timestamp = yield* parseOptionalTimestampMs(timestampInput)
  const node = yield* parseOptionalNode(nodeInput)
  const nodeBits = yield* parseOptionalNodeBits(nodeBitsInput)
  const ids = yield* generateTsid({ count, timestamp, node, nodeBits })
  yield* output.write(idsOutput(ids), { json })
})
