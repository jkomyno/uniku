import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { ksuid } from 'uniku/ksuid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type KsuidGenerateOptions = {
  readonly count: number
  readonly timestamp?: number
}

export function generateKsuid(options: KsuidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        const ksuidOpts = options.timestamp != null ? { msecs: options.timestamp } : undefined
        ids.push(ksuid(ksuidOpts))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
