import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { generateUuid } from '@/src/generators/uuid'
import { idsOutput, OutputService } from '@/src/services/OutputService'

export type GenerateUuidParams = {
  readonly count: number
  readonly json: boolean
  readonly version: 4 | 5 | 7
  readonly lowercase: boolean
  readonly name: Option.Option<string>
  readonly namespace: Option.Option<string>
}

export const runGenerateUuid = Effect.fn('cli.generate.uuid')(function* ({
  count,
  json,
  version,
  lowercase,
  name,
  namespace,
}: GenerateUuidParams) {
  const output = yield* OutputService
  const ids = yield* generateUuid({
    count,
    version,
    lowercase,
    name: Option.getOrUndefined(name),
    namespace: Option.getOrUndefined(namespace),
  })
  yield* output.write(idsOutput(ids), { json })
})
