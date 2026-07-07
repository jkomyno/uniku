import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { objectid } from 'uniku/objectid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type ObjectidGenerateOptions = {
  readonly count: number
  readonly timestamp?: number
}

export function generateObjectid(options: ObjectidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        const objectidOpts = options.timestamp != null ? { secs: options.timestamp } : undefined
        ids.push(objectid(objectidOpts))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
