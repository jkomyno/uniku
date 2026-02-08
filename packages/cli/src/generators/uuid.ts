import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type UuidGenerateOptions = {
  readonly count: number
  readonly version: number
  readonly lowercase: boolean
}

export function generateUuid(options: UuidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const gen = options.version === 7 ? uuidv7 : uuidv4
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        let id = gen()
        if (options.lowercase) {
          id = id.toLowerCase()
        }
        ids.push(id)
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError('GENERATE_FAILED', String(err))
    },
  })
}
