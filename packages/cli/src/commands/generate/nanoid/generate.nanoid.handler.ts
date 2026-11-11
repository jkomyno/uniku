import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { generateNanoid } from '@/src/generators/nanoid'
import { idsOutput, OutputService } from '@/src/services/OutputService'

export type GenerateNanoidParams = {
  readonly count: number
  readonly json: boolean
  readonly length: number
  readonly alphabet: Option.Option<string>
}

export const runGenerateNanoid = Effect.fn('cli.generate.nanoid')(function* ({
  count,
  json,
  length,
  alphabet,
}: GenerateNanoidParams) {
  const output = yield* OutputService
  const ids = yield* generateNanoid({ count, length, alphabet: Option.getOrUndefined(alphabet) })
  yield* output.write(idsOutput(ids), { json })
})
