import * as Effect from 'effect/Effect'
import { cuidv2 } from 'uniku/cuid/v2'
import { UniqueIdError } from 'uniku/errors'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type CuidGenerateOptions = {
  readonly count: number
  readonly length: number
}

export function generateCuid(options: CuidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        ids.push(cuidv2({ length: options.length }))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
