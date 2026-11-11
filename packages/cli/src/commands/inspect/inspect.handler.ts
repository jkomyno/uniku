import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { CliError } from '@/src/domain/errors'
import type { IdType } from '@/src/domain/types'
import { inspectId } from '@/src/inspectors/inspect'
import { inspectOutput, OutputService } from '@/src/services/OutputService'

export type InspectParams = {
  readonly id: string
  readonly type: Option.Option<IdType>
  readonly json: boolean
}

export const runInspect = Effect.fn('cli.inspect')(function* ({ id, type, json }: InspectParams) {
  const output = yield* OutputService

  const result = inspectId(id, Option.getOrUndefined(type))
  if (!result) {
    return yield* new CliError({
      code: 'UNKNOWN_ID_TYPE',
      message: `Could not identify ID type for: "${id}"`,
      hint: 'Use --type to specify the ID type',
    })
  }

  yield* output.write(inspectOutput(result), { json })
})
