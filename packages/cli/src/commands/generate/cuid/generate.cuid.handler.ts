import * as Effect from 'effect/Effect'
import { generateCuid } from '@/src/generators/cuid'
import { idsOutput, OutputService } from '@/src/services/OutputService'

export type GenerateCuidParams = {
  readonly count: number
  readonly json: boolean
  readonly length: number
}

export const runGenerateCuid = Effect.fn('cli.generate.cuid')(function* ({ count, json, length }: GenerateCuidParams) {
  const output = yield* OutputService
  const ids = yield* generateCuid({ count, length })
  yield* output.write(idsOutput(ids), { json })
})
