import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { UniqueIdError } from 'uniku/errors'
import { CliError, fromUnikuError } from '@/src/domain/errors'
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

  const expectedType = Option.getOrUndefined(type)
  const result = yield* Effect.try({
    try: () => inspectId(id, expectedType),
    catch: (error) =>
      error instanceof UniqueIdError
        ? fromUnikuError(error)
        : new CliError({ code: 'INSPECT_FAILED', message: String(error) }),
  })
  if (!result) {
    return yield* new CliError({
      code: expectedType ? 'INVALID_ID' : 'UNKNOWN_ID_TYPE',
      message: expectedType ? `Invalid ${expectedType} identifier: "${id}"` : `Could not identify ID type for: "${id}"`,
      hint: expectedType ? 'Check the ID or select a different --type' : 'Use --type to specify the ID type',
    })
  }

  yield* output.write(inspectOutput(result), { json })
})
