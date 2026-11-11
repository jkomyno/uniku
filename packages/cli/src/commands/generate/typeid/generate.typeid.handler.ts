import * as Effect from 'effect/Effect'
import { generateTypeid } from '@/src/generators/typeid'
import { idsOutput, OutputService } from '@/src/services/OutputService'

export type GenerateTypeidParams = {
  readonly count: number
  readonly json: boolean
  readonly prefix: string
}

export const runGenerateTypeid = Effect.fn('cli.generate.typeid')(function* ({
  count,
  json,
  prefix,
}: GenerateTypeidParams) {
  const output = yield* OutputService
  const ids = yield* generateTypeid({ count, prefix })
  yield* output.write(idsOutput(ids), { json })
})
